// spot browse, list, and edit

const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireLogin, requireSpotOwner } = require('../middleware/auth');

const router = express.Router();

// browse with search, filter, sort
router.get('/', async (req, res, next) => {
  try {
    const {
      q = '',
      type_id = '',
      max_price = '',
      start = '',
      end = '',
      sort = 'price_asc',
    } = req.query;

    const where = ['s.is_active = TRUE'];
    const params = [];

    if (q) {
      where.push('(a.street LIKE ? OR a.zip_code LIKE ? OR a.city LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (type_id) {
      where.push('s.spot_type_id = ?');
      params.push(parseInt(type_id, 10));
    }
    if (max_price) {
      where.push('s.hourly_rate <= ?');
      params.push(parseFloat(max_price));
    }

    // spot must have an available window covering the requested range and no overlapping pending or confirmed reservation
    if (start && end) {
      where.push(`EXISTS (
        SELECT 1 FROM availability_windows aw
         WHERE aw.spot_id = s.spot_id
           AND aw.availability_kind = 'Available'
           AND aw.start_time <= ?
           AND aw.end_time   >= ?
      )`);
      params.push(start, end);
      where.push(`s.spot_id NOT IN (
        SELECT r.spot_id FROM reservations r
          JOIN reservation_statuses rs ON r.status_id = rs.status_id
         WHERE rs.status_name IN ('Pending','Confirmed')
           AND r.start_time < ?
           AND r.end_time   > ?
      )`);
      params.push(end, start);
    }

    const sortMap = {
      price_asc: 's.hourly_rate ASC',
      price_desc: 's.hourly_rate DESC',
      newest: 's.spot_id DESC',
    };
    const orderBy = sortMap[sort] || sortMap.price_asc;

    const sql = `
      SELECT s.spot_id, s.hourly_rate, s.instructions, s.is_active,
             a.street, a.city, a.state, a.zip_code,
             st.type_name,
             u.first_name AS host_first, u.last_name AS host_last,
             (SELECT sp.photo_url FROM spot_photos sp
               WHERE sp.spot_id = s.spot_id
               ORDER BY sp.uploaded_at DESC LIMIT 1) AS cover_photo
        FROM spots s
        JOIN addresses a   ON s.address_id   = a.address_id
        JOIN spot_types st ON s.spot_type_id = st.spot_type_id
        JOIN users u       ON s.host_user_id = u.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY ${orderBy}`;

    const [spots] = await pool.query(sql, params);
    const [types] = await pool.query('SELECT spot_type_id, type_name FROM spot_types ORDER BY type_name');
    const [[{ globalMax }]] = await pool.query('SELECT COALESCE(MAX(hourly_rate), 0) AS globalMax FROM spots WHERE is_active = TRUE');

    res.render('spots/browse', {
      title: 'Find a spot',
      spots,
      types,
      globalMax: parseFloat(globalMax),
      filters: { q, type_id, max_price, start, end, sort },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/new', requireLogin, async (req, res, next) => {
  try {
    const [types] = await pool.query('SELECT spot_type_id, type_name FROM spot_types ORDER BY type_name');
    res.render('spots/form', { title: 'List your spot', types, spot: null, form: {}, errors: [] });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/',
  requireLogin,
  body('street').trim().isLength({ min: 3, max: 255 }),
  body('city').trim().isLength({ min: 1, max: 64 }),
  body('state').trim().isLength({ min: 2, max: 2 }),
  body('zip_code').trim().isLength({ min: 5, max: 10 }),
  body('spot_type_id').isInt(),
  body('hourly_rate').isFloat({ min: 0.01 }),
  body('instructions').optional({ checkFalsy: true }).isLength({ max: 2000 }),
  body('photo_url').trim().isURL({ require_protocol: true }).withMessage('A valid photo URL is required').isLength({ max: 2000 }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const [types] = await pool.query('SELECT spot_type_id, type_name FROM spot_types ORDER BY type_name');
      return res.render('spots/form', {
        title: 'List your spot',
        types,
        spot: null,
        form: req.body,
        errors: errors.array(),
      });
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [aRes] = await conn.query(
        'INSERT INTO addresses (street, city, state, zip_code) VALUES (?, ?, ?, ?)',
        [req.body.street, req.body.city, req.body.state.toUpperCase(), req.body.zip_code],
      );
      const [sRes] = await conn.query(
        `INSERT INTO spots
           (host_user_id, address_id, spot_type_id, hourly_rate, is_active, instructions)
         VALUES (?, ?, ?, ?, TRUE, ?)`,
        [
          req.session.user.user_id,
          aRes.insertId,
          parseInt(req.body.spot_type_id, 10),
          parseFloat(req.body.hourly_rate),
          req.body.instructions || null,
        ],
      );
      await conn.query(
        'INSERT INTO spot_photos (spot_id, photo_url, uploaded_at) VALUES (?, ?, NOW())',
        [sRes.insertId, req.body.photo_url],
      );
      await conn.commit();
      req.session.flash = { type: 'success', msg: 'Spot listed!' };
      res.redirect(`/spots/${sRes.insertId}`);
    } catch (e) {
      await conn.rollback();
      next(e);
    } finally {
      conn.release();
    }
  },
);

router.get('/:id', async (req, res, next) => {
  try {
    const spotId = parseInt(req.params.id, 10);
    const [spotRows] = await pool.query(
      `SELECT s.spot_id, s.hourly_rate, s.is_active, s.instructions,
              a.street, a.city, a.state, a.zip_code,
              st.type_name, s.spot_type_id,
              u.user_id AS host_id, u.first_name AS host_first, u.last_name AS host_last
         FROM spots s
         JOIN addresses a   ON s.address_id   = a.address_id
         JOIN spot_types st ON s.spot_type_id = st.spot_type_id
         JOIN users u       ON s.host_user_id = u.user_id
        WHERE s.spot_id = ?`,
      [spotId],
    );
    if (!spotRows.length) {
      return res.status(404).render('error', { title: 'Not found', message: 'Spot not found.' });
    }
    const [photos] = await pool.query(
      'SELECT photo_id, photo_url, uploaded_at FROM spot_photos WHERE spot_id = ? ORDER BY uploaded_at ASC',
      [spotId],
    );
    const [windows] = await pool.query(
      `SELECT window_id, start_time, end_time, availability_kind
         FROM availability_windows WHERE spot_id = ? ORDER BY start_time ASC`,
      [spotId],
    );
    // host average rating
    const [[rating]] = await pool.query(
      `SELECT ROUND(AVG(rv.rating), 2) AS avg_rating, COUNT(rv.reservation_id) AS total_reviews
         FROM users u
         JOIN spots s        ON s.host_user_id = u.user_id
         JOIN reservations r ON r.spot_id = s.spot_id
         JOIN reviews rv     ON rv.reservation_id = r.reservation_id
        WHERE u.user_id = ?`,
      [spotRows[0].host_id],
    );
    const [spotReviews] = await pool.query(
      `SELECT rv.rating, rv.comment, rv.created_at,
              u.first_name AS renter_first, u.last_name AS renter_last
         FROM reviews rv
         JOIN reservations r ON rv.reservation_id = r.reservation_id
         JOIN users u        ON r.renter_user_id  = u.user_id
        WHERE r.spot_id = ?
        ORDER BY rv.created_at DESC
        LIMIT 10`,
      [spotId],
    );

    let vehicles = [];
    if (req.session.user) {
      [vehicles] = await pool.query(
        `SELECT v.vehicle_id, v.make, v.model, v.year, v.color, vr.license_plate
           FROM vehicles v
      LEFT JOIN vehicle_registrations vr ON v.vehicle_id = vr.vehicle_id
          WHERE v.user_id = ?`,
        [req.session.user.user_id],
      );
    }

    res.render('spots/detail', {
      title: `Spot #${spotId}`,
      spot: spotRows[0],
      photos,
      windows,
      rating,
      spotReviews,
      vehicles,
      isOwner: req.session.user && req.session.user.user_id === spotRows[0].host_id,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/edit', requireLogin, requireSpotOwner('id'), async (req, res, next) => {
  try {
    const [[spot]] = await pool.query(
      `SELECT s.*, a.street, a.city, a.state, a.zip_code
         FROM spots s JOIN addresses a ON s.address_id = a.address_id
        WHERE s.spot_id = ?`,
      [req.params.id],
    );
    const [types] = await pool.query('SELECT spot_type_id, type_name FROM spot_types ORDER BY type_name');
    res.render('spots/form', { title: 'Edit spot', types, spot, form: spot, errors: [] });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/edit', requireLogin, requireSpotOwner('id'), async (req, res, next) => {
  try {
    const { hourly_rate, instructions, is_active, spot_type_id } = req.body;
    await pool.query(
      `UPDATE spots
          SET hourly_rate  = ?,
              instructions = ?,
              is_active    = ?,
              spot_type_id = ?
        WHERE spot_id = ? AND host_user_id = ?`,
      [
        parseFloat(hourly_rate),
        instructions || null,
        is_active === 'on' || is_active === 'true' ? 1 : 0,
        parseInt(spot_type_id, 10),
        req.params.id,
        req.session.user.user_id,
      ],
    );
    req.session.flash = { type: 'success', msg: 'Spot updated.' };
    res.redirect(`/spots/${req.params.id}`);
  } catch (e) {
    next(e);
  }
});

// soft delete
router.post('/:id/deactivate', requireLogin, requireSpotOwner('id'), async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE spots SET is_active = FALSE WHERE spot_id = ? AND host_user_id = ?',
      [req.params.id, req.session.user.user_id],
    );
    req.session.flash = { type: 'info', msg: 'Spot deactivated.' };
    res.redirect('/dashboard/host');
  } catch (e) {
    next(e);
  }
});

// hard delete only if there are no reservations
router.post('/:id/delete', requireLogin, requireSpotOwner('id'), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[cnt]] = await conn.query(
      'SELECT COUNT(*) AS c FROM reservations WHERE spot_id = ?',
      [req.params.id],
    );
    if (cnt.c > 0) {
      await conn.rollback();
      req.session.flash = {
        type: 'warning',
        msg: 'Spot has reservations — deactivated instead of deleted.',
      };
      await pool.query('UPDATE spots SET is_active = FALSE WHERE spot_id = ?', [req.params.id]);
      return res.redirect('/dashboard/host');
    }
    await conn.query('DELETE FROM spot_photos WHERE spot_id = ?', [req.params.id]);
    await conn.query('DELETE FROM availability_windows WHERE spot_id = ?', [req.params.id]);
    await conn.query('DELETE FROM spots WHERE spot_id = ?', [req.params.id]);
    await conn.commit();
    req.session.flash = { type: 'success', msg: 'Spot deleted.' };
    res.redirect('/dashboard/host');
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

router.post(
  '/:id/photos',
  requireLogin,
  requireSpotOwner('id'),
  body('photo_url').trim().isURL({ require_protocol: true }).isLength({ max: 2000 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.session.flash = { type: 'danger', msg: 'A valid photo URL is required.' };
        return res.redirect(`/spots/${req.params.id}`);
      }
      await pool.query(
        'INSERT INTO spot_photos (spot_id, photo_url, uploaded_at) VALUES (?, ?, NOW())',
        [req.params.id, req.body.photo_url],
      );
      res.redirect(`/spots/${req.params.id}`);
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/:id/photos/:pid/delete',
  requireLogin,
  requireSpotOwner('id'),
  async (req, res, next) => {
    try {
      await pool.query('DELETE FROM spot_photos WHERE photo_id = ? AND spot_id = ?', [
        req.params.pid,
        req.params.id,
      ]);
      res.redirect(`/spots/${req.params.id}`);
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/:id/availability',
  requireLogin,
  requireSpotOwner('id'),
  async (req, res, next) => {
    try {
      await pool.query(
        `INSERT INTO availability_windows (spot_id, start_time, end_time, availability_kind)
         VALUES (?, ?, ?, ?)`,
        [req.params.id, req.body.start_time, req.body.end_time, req.body.availability_kind || 'Available'],
      );
      res.redirect(`/spots/${req.params.id}`);
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/:id/availability/:wid/delete',
  requireLogin,
  requireSpotOwner('id'),
  async (req, res, next) => {
    try {
      await pool.query('DELETE FROM availability_windows WHERE window_id = ? AND spot_id = ?', [
        req.params.wid,
        req.params.id,
      ]);
      res.redirect(`/spots/${req.params.id}`);
    } catch (e) {
      next(e);
    }
  },
);

module.exports = router;
