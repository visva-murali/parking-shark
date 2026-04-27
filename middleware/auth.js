// application level access control, session check and ownership checks against the database

const pool = require('../config/db');

function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.session.flash = { type: 'warning', msg: 'Please log in to continue.' };
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).render('error', {
      title: 'Forbidden',
      message: 'Admin privileges required.',
    });
  }
  next();
}

function requireSpotOwner(idParam = 'id') {
  return async (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    try {
      const [rows] = await pool.query(
        'SELECT host_user_id FROM spots WHERE spot_id = ?',
        [req.params[idParam]],
      );
      if (!rows.length) {
        return res.status(404).render('error', { title: 'Not found', message: 'Spot not found.' });
      }
      if (rows[0].host_user_id !== req.session.user.user_id) {
        return res.status(403).render('error', {
          title: 'Forbidden',
          message: 'You do not own this spot.',
        });
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

function requireReservationOwner(idParam = 'id') {
  return async (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    try {
      const [rows] = await pool.query(
        `SELECT r.renter_user_id, s.host_user_id
           FROM reservations r
           JOIN spots s ON r.spot_id = s.spot_id
          WHERE r.reservation_id = ?`,
        [req.params[idParam]],
      );
      if (!rows.length) {
        return res
          .status(404)
          .render('error', { title: 'Not found', message: 'Reservation not found.' });
      }
      const uid = req.session.user.user_id;
      if (rows[0].renter_user_id !== uid && rows[0].host_user_id !== uid) {
        return res.status(403).render('error', {
          title: 'Forbidden',
          message: 'You are not a party to this reservation.',
        });
      }
      req.reservationRoles = {
        isRenter: rows[0].renter_user_id === uid,
        isHost: rows[0].host_user_id === uid,
      };
      next();
    } catch (e) {
      next(e);
    }
  };
}

module.exports = {
  requireLogin,
  requireAdmin,
  requireSpotOwner,
  requireReservationOwner,
};
