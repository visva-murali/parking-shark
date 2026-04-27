// renter and host dashboards

const express = require('express');
const pool = require('../config/db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.get('/renter', requireLogin, async (req, res, next) => {
  try {
    const [reservations] = await pool.query(
      `SELECT r.reservation_id, r.start_time, r.end_time, r.total_cost, r.created_at,
              rs.status_name,
              s.spot_id, a.street, a.city,
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
    res.render('dashboard/renter', { title: 'My bookings', reservations });
  } catch (e) {
    next(e);
  }
});

router.get('/host', requireLogin, async (req, res, next) => {
  try {
    // host listings
    const [spots] = await pool.query(
      `SELECT s.spot_id, s.hourly_rate, s.is_active, s.instructions,
              a.street, a.city, st.type_name,
              (SELECT COUNT(*) FROM reservations r WHERE r.spot_id = s.spot_id) AS total_bookings
         FROM spots s
         JOIN addresses a   ON s.address_id   = a.address_id
         JOIN spot_types st ON s.spot_type_id = st.spot_type_id
        WHERE s.host_user_id = ?
        ORDER BY s.is_active DESC, s.spot_id ASC`,
      [req.session.user.user_id],
    );

    // bookings on host spots
    const [bookings] = await pool.query(
      `SELECT r.reservation_id, r.start_time, r.end_time, r.total_cost,
              rs.status_name,
              u.first_name AS renter_first, u.last_name AS renter_last, u.email,
              s.spot_id, a.street,
              v.make, v.model, vr.license_plate
         FROM reservations r
         JOIN reservation_statuses rs ON r.status_id       = rs.status_id
         JOIN users u                 ON r.renter_user_id  = u.user_id
         JOIN spots s                 ON r.spot_id         = s.spot_id
         JOIN addresses a             ON s.address_id      = a.address_id
         JOIN vehicles v              ON r.vehicle_id      = v.vehicle_id
    LEFT JOIN vehicle_registrations vr ON v.vehicle_id     = vr.vehicle_id
        WHERE s.host_user_id = ?
        ORDER BY r.start_time DESC`,
      [req.session.user.user_id],
    );

    // reviews on host spots
    const [reviews] = await pool.query(
      `SELECT rv.reservation_id, rv.rating, rv.comment, rv.created_at,
              u.first_name AS renter_first, u.last_name AS renter_last,
              s.spot_id, a.street
         FROM reviews rv
         JOIN reservations r ON rv.reservation_id = r.reservation_id
         JOIN spots s        ON r.spot_id = s.spot_id
         JOIN addresses a    ON s.address_id = a.address_id
         JOIN users u        ON r.renter_user_id = u.user_id
        WHERE s.host_user_id = ?
        ORDER BY rv.created_at DESC`,
      [req.session.user.user_id],
    );

    // host average rating
    const [[ratingRow]] = await pool.query(
      `SELECT ROUND(AVG(rv.rating), 2) AS avg_rating, COUNT(rv.reservation_id) AS total_reviews
         FROM users u
         JOIN spots s        ON s.host_user_id = u.user_id
         JOIN reservations r ON r.spot_id = s.spot_id
         JOIN reviews rv     ON rv.reservation_id = r.reservation_id
        WHERE u.user_id = ?`,
      [req.session.user.user_id],
    );

    res.render('dashboard/host', {
      title: 'My listings',
      spots,
      bookings,
      reviews,
      rating: ratingRow || { avg_rating: null, total_reviews: 0 },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
