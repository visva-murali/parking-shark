// Reservations, payments, reviews.
// SQL reference: parking_shark.sql §4.5, §4.7, §4.14, §5.2–5.5, §5.10,
//                §6.6, §6.7, and the create_booking stored procedure.

const express = require('express');
const pool = require('../config/db');
const { requireLogin, requireReservationOwner } = require('../middleware/auth');

const router = express.Router();

// ---------- POST /reservations - book via stored procedure ----------
// Uses the create_booking stored procedure (parking_shark.sql §7 "Advanced
// SQL #2"). The stored proc handles rate lookup, cost calculation,
// conflict check, reservation insert, and payment insert - atomically.
// The prevent_double_booking trigger (Advanced SQL #1) runs on the INSERT
// and raises SIGNAL if an overlap exists.
router.post('/', requireLogin, async (req, res, next) => {
  const { spot_id, vehicle_id, start_time, end_time, payment_method } = req.body;
  const spotId = parseInt(spot_id, 10);
  const vehicleId = parseInt(vehicle_id, 10);

  if (
    !Number.isInteger(spotId) ||
    !Number.isInteger(vehicleId) ||
    !start_time ||
    !end_time ||
    new Date(end_time) <= new Date(start_time)
  ) {
    req.session.flash = { type: 'danger', msg: 'Choose a valid vehicle and time range.' };
    return res.redirect(spot_id ? `/spots/${spot_id}` : '/spots');
  }

  const conn = await pool.getConnection();
  try {
    const [[spot]] = await conn.query(
      'SELECT host_user_id, is_active FROM spots WHERE spot_id = ?',
      [spotId],
    );
    if (!spot || !spot.is_active) {
      req.session.flash = { type: 'danger', msg: 'That spot is not available.' };
      return res.redirect('/spots');
    }
    if (spot.host_user_id === req.session.user.user_id) {
      req.session.flash = { type: 'warning', msg: 'You cannot book your own listing.' };
      return res.redirect(`/spots/${spotId}`);
    }

    const [[vehicle]] = await conn.query(
      'SELECT vehicle_id FROM vehicles WHERE vehicle_id = ? AND user_id = ?',
      [vehicleId, req.session.user.user_id],
    );
    if (!vehicle) {
      req.session.flash = { type: 'danger', msg: 'Choose one of your own vehicles.' };
      return res.redirect(`/spots/${spotId}`);
    }

    await conn.query('CALL create_booking(?, ?, ?, ?, ?, ?, @new_id)', [
      spotId,
      req.session.user.user_id,
      vehicleId,
      start_time,
      end_time,
      payment_method || 'Credit Card',
    ]);
    const [[row]] = await conn.query('SELECT @new_id AS new_id');
    req.session.flash = { type: 'success', msg: `Booking #${row.new_id} created.` };
    res.redirect('/dashboard/renter');
  } catch (err) {
    // Stored procedure raises SIGNAL SQLSTATE '45000' on conflict or bad input.
    if (err.sqlState === '45000') {
      req.session.flash = { type: 'danger', msg: err.sqlMessage };
      return res.redirect(`/spots/${spotId}`);
    }
    next(err);
  } finally {
    conn.release();
  }
});

// ---------- GET /reservations/:id - detail (§4.7) ----------
router.get('/:id', requireLogin, requireReservationOwner('id'), async (req, res, next) => {
  try {
    const [[r]] = await pool.query(
      `SELECT r.reservation_id, r.start_time, r.end_time, r.hourly_rate_at_booking,
              r.total_cost, r.created_at,
              rs.status_name,
              s.spot_id, a.street, a.city, a.state, a.zip_code, st.type_name,
              u.first_name AS renter_first, u.last_name AS renter_last, u.email,
              v.make, v.model, v.year, v.color,
              vr.license_plate, vr.plate_state,
              p.payment_id, p.amount, p.paid_at, p.method, p.payment_status
         FROM reservations r
         JOIN reservation_statuses rs ON r.status_id    = rs.status_id
         JOIN spots s                 ON r.spot_id      = s.spot_id
         JOIN addresses a             ON s.address_id   = a.address_id
         JOIN spot_types st           ON s.spot_type_id = st.spot_type_id
         JOIN users u                 ON r.renter_user_id = u.user_id
         JOIN vehicles v              ON r.vehicle_id  = v.vehicle_id
    LEFT JOIN vehicle_registrations vr ON v.vehicle_id = vr.vehicle_id
    LEFT JOIN payments p              ON r.reservation_id = p.reservation_id
        WHERE r.reservation_id = ?`,
      [req.params.id],
    );
    const [reviewRows] = await pool.query(
      'SELECT rating, comment, created_at FROM reviews WHERE reservation_id = ?',
      [req.params.id],
    );
    res.render('reservations/detail', {
      title: `Reservation #${r.reservation_id}`,
      r,
      roles: req.reservationRoles,
      review: reviewRows[0] || null,
    });
  } catch (e) {
    next(e);
  }
});

// ---------- POST /reservations/:id/status (AJAX or form) ----------
// Actions: confirm (§5.2), complete (§5.3), cancel (§5.4).
router.post('/:id/status', requireLogin, requireReservationOwner('id'), async (req, res, next) => {
  const { action } = req.body;
  const nameMap = {
    confirm: 'Confirmed',
    complete: 'Completed',
    cancel: 'Cancelled',
  };
  const target = nameMap[action];
  if (!target) {
    return res.status(400).json({ error: 'Unknown action.' });
  }
  // Renter may only cancel; host may confirm/complete/cancel.
  if (action !== 'cancel' && !req.reservationRoles.isHost) {
    return res.status(403).json({ error: 'Only the host can do that.' });
  }
  try {
    await pool.query(
      `UPDATE reservations
          SET status_id = (SELECT status_id FROM reservation_statuses WHERE status_name = ?)
        WHERE reservation_id = ?`,
      [target, req.params.id],
    );
    if (req.accepts(['html', 'json']) === 'json') {
      return res.json({ ok: true, status: target });
    }
    req.session.flash = { type: 'success', msg: `Reservation ${target.toLowerCase()}.` };
    res.redirect('back');
  } catch (e) {
    next(e);
  }
});

// ---------- POST /reservations/:id/extend - UPDATE end_time ----------
router.post('/:id/extend', requireLogin, requireReservationOwner('id'), async (req, res, next) => {
  if (!req.reservationRoles.isRenter) {
    return res.status(403).render('error', { title: 'Forbidden', message: 'Only the renter can extend.' });
  }
  try {
    // Re-check for conflicts before extending.
    const [[r]] = await pool.query(
      'SELECT spot_id, start_time, hourly_rate_at_booking FROM reservations WHERE reservation_id = ?',
      [req.params.id],
    );
    const newEnd = req.body.end_time;
    const [[{ conflicts }]] = await pool.query(
      `SELECT COUNT(*) AS conflicts FROM reservations r
         JOIN reservation_statuses rs ON r.status_id = rs.status_id
        WHERE r.spot_id = ?
          AND r.reservation_id <> ?
          AND rs.status_name IN ('Pending','Confirmed')
          AND r.start_time < ?
          AND r.end_time   > ?`,
      [r.spot_id, req.params.id, newEnd, r.start_time],
    );
    if (conflicts > 0) {
      req.session.flash = { type: 'danger', msg: 'Cannot extend: another booking overlaps.' };
      return res.redirect(`/reservations/${req.params.id}`);
    }
    // Recalculate total cost at the booking-time rate.
    await pool.query(
      `UPDATE reservations
          SET end_time = ?,
              total_cost = ROUND(hourly_rate_at_booking * (TIMESTAMPDIFF(MINUTE, start_time, ?)/60.0), 2)
        WHERE reservation_id = ?`,
      [newEnd, newEnd, req.params.id],
    );
    // Keep payment in sync for Pending payments.
    await pool.query(
      `UPDATE payments p
         JOIN reservations r ON p.reservation_id = r.reservation_id
          SET p.amount = r.total_cost
        WHERE p.reservation_id = ? AND p.payment_status = 'Pending'`,
      [req.params.id],
    );
    req.session.flash = { type: 'success', msg: 'Reservation extended.' };
    res.redirect(`/reservations/${req.params.id}`);
  } catch (e) {
    next(e);
  }
});

// ---------- POST /reservations/:id/pay (§5.5) ----------
router.post('/:id/pay', requireLogin, requireReservationOwner('id'), async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE payments
          SET paid_at = NOW(), payment_status = 'Paid'
        WHERE reservation_id = ?`,
      [req.params.id],
    );
    req.session.flash = { type: 'success', msg: 'Payment recorded.' };
    res.redirect(`/reservations/${req.params.id}`);
  } catch (e) {
    next(e);
  }
});

// ---------- POST /reservations/:id/review - add review ----------
router.post('/:id/review', requireLogin, requireReservationOwner('id'), async (req, res, next) => {
  if (!req.reservationRoles.isRenter) {
    return res.status(403).render('error', { title: 'Forbidden', message: 'Only the renter can review.' });
  }
  try {
    const [[{ status_name }]] = await pool.query(
      `SELECT rs.status_name FROM reservations r
         JOIN reservation_statuses rs ON r.status_id = rs.status_id
        WHERE r.reservation_id = ?`,
      [req.params.id],
    );
    if (status_name !== 'Completed') {
      req.session.flash = { type: 'warning', msg: 'You can only review completed reservations.' };
      return res.redirect(`/reservations/${req.params.id}`);
    }
    // Upsert (§5.10 or fresh INSERT)
    await pool.query(
      `INSERT INTO reviews (reservation_id, rating, comment, created_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
      [req.params.id, parseInt(req.body.rating, 10), req.body.comment || null],
    );
    req.session.flash = { type: 'success', msg: 'Review saved.' };
    res.redirect(`/reservations/${req.params.id}`);
  } catch (e) {
    next(e);
  }
});

// ---------- POST /reservations/:id/review/delete (§6.6) ----------
router.post(
  '/:id/review/delete',
  requireLogin,
  requireReservationOwner('id'),
  async (req, res, next) => {
    if (!req.reservationRoles.isRenter) {
      return res.status(403).render('error', { title: 'Forbidden', message: 'Only the renter can delete a review.' });
    }
    try {
      await pool.query('DELETE FROM reviews WHERE reservation_id = ?', [req.params.id]);
      req.session.flash = { type: 'info', msg: 'Review removed.' };
      res.redirect(`/reservations/${req.params.id}`);
    } catch (e) {
      next(e);
    }
  },
);

// ---------- POST /reservations/:id/delete (§6.7 - only if Cancelled) ----------
router.post('/:id/delete', requireLogin, requireReservationOwner('id'), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // §6.7 - delete payment then reservation, only if Cancelled.
    await conn.query(
      `DELETE FROM payments
        WHERE reservation_id IN (
          SELECT reservation_id FROM (
            SELECT r.reservation_id FROM reservations r
            JOIN reservation_statuses rs ON r.status_id = rs.status_id
            WHERE r.reservation_id = ? AND rs.status_name = 'Cancelled'
          ) AS x
        )`,
      [req.params.id],
    );
    const [del] = await conn.query(
      `DELETE FROM reservations
        WHERE reservation_id = ?
          AND status_id = (SELECT status_id FROM reservation_statuses WHERE status_name = 'Cancelled')`,
      [req.params.id],
    );
    await conn.commit();
    if (del.affectedRows === 0) {
      req.session.flash = { type: 'warning', msg: 'Only cancelled reservations can be deleted.' };
    } else {
      req.session.flash = { type: 'success', msg: 'Reservation removed.' };
    }
    res.redirect('/dashboard/renter');
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

module.exports = router;
