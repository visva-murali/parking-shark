// csv export

const express = require('express');
const { stringify } = require('csv-stringify/sync');
const pool = require('../config/db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

function sendCsv(res, filename, rows) {
  const csv = stringify(rows, { header: true });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

// renter own bookings
router.get('/reservations.csv', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.reservation_id, r.start_time, r.end_time, r.total_cost,
              rs.status_name,
              a.street, a.city, a.state, a.zip_code,
              v.make, v.model, v.year
         FROM reservations r
         JOIN reservation_statuses rs ON r.status_id    = rs.status_id
         JOIN spots s                 ON r.spot_id      = s.spot_id
         JOIN addresses a             ON s.address_id   = a.address_id
         JOIN vehicles v              ON r.vehicle_id   = v.vehicle_id
        WHERE r.renter_user_id = ?
        ORDER BY r.start_time DESC`,
      [req.session.user.user_id],
    );
    sendCsv(res, 'my-reservations.csv', rows);
  } catch (e) {
    next(e);
  }
});

// host incoming bookings
router.get('/host-bookings.csv', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.reservation_id, r.start_time, r.end_time, r.total_cost,
              rs.status_name,
              u.first_name AS renter_first, u.last_name AS renter_last, u.email,
              a.street,
              v.make, v.model, vr.license_plate
         FROM reservations r
         JOIN reservation_statuses rs ON r.status_id      = rs.status_id
         JOIN users u                 ON r.renter_user_id = u.user_id
         JOIN spots s                 ON r.spot_id        = s.spot_id
         JOIN addresses a             ON s.address_id     = a.address_id
         JOIN vehicles v              ON r.vehicle_id     = v.vehicle_id
    LEFT JOIN vehicle_registrations vr ON v.vehicle_id    = vr.vehicle_id
        WHERE s.host_user_id = ?
        ORDER BY r.start_time DESC`,
      [req.session.user.user_id],
    );
    sendCsv(res, 'incoming-bookings.csv', rows);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
