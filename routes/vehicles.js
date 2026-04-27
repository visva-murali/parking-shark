// vehicles and their registrations

const express = require('express');
const pool = require('../config/db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireLogin, async (req, res, next) => {
  try {
    const [vehicles] = await pool.query(
      `SELECT v.vehicle_id, v.make, v.model, v.year, v.color,
              vr.license_plate, vr.plate_state, vr.expires_on, vr.is_verified, vr.verified_at
         FROM vehicles v
    LEFT JOIN vehicle_registrations vr ON v.vehicle_id = vr.vehicle_id
        WHERE v.user_id = ?`,
      [req.session.user.user_id],
    );
    res.render('vehicles/list', { title: 'My vehicles', vehicles });
  } catch (e) {
    next(e);
  }
});

router.get('/new', requireLogin, (req, res) => {
  res.render('vehicles/form', { title: 'Add a vehicle', form: {}, errors: [] });
});

// add vehicle and registration
router.post('/', requireLogin, async (req, res, next) => {
  const { make, model, year, color, license_plate, plate_state, expires_on } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [vr] = await conn.query(
      `INSERT INTO vehicles (user_id, make, model, year, color)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.session.user.user_id,
        make,
        model,
        year ? parseInt(year, 10) : null,
        color || null,
      ],
    );
    if (license_plate) {
      await conn.query(
        `INSERT INTO vehicle_registrations
           (vehicle_id, license_plate, plate_state, expires_on, is_verified)
         VALUES (?, ?, ?, ?, FALSE)`,
        [vr.insertId, license_plate, plate_state || 'VA', expires_on || null],
      );
    }
    await conn.commit();
    req.session.flash = { type: 'success', msg: 'Vehicle added.' };
    res.redirect('/vehicles');
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') {
      return res.render('vehicles/form', {
        title: 'Add a vehicle',
        form: req.body,
        errors: [{ msg: 'License plate already registered.' }],
      });
    }
    next(e);
  } finally {
    conn.release();
  }
});

router.post('/:id/verify', requireLogin, async (req, res, next) => {
  try {
    const [[own]] = await pool.query('SELECT user_id FROM vehicles WHERE vehicle_id = ?', [
      req.params.id,
    ]);
    if (!own || own.user_id !== req.session.user.user_id) {
      return res.status(403).render('error', { title: 'Forbidden', message: 'Not your vehicle.' });
    }
    await pool.query(
      `UPDATE vehicle_registrations
          SET is_verified = TRUE, verified_at = NOW()
        WHERE vehicle_id = ?`,
      [req.params.id],
    );
    req.session.flash = { type: 'success', msg: 'Registration verified.' };
    res.redirect('/vehicles');
  } catch (e) {
    next(e);
  }
});

router.post('/:id/registration/delete', requireLogin, async (req, res, next) => {
  try {
    const [[own]] = await pool.query('SELECT user_id FROM vehicles WHERE vehicle_id = ?', [
      req.params.id,
    ]);
    if (!own || own.user_id !== req.session.user.user_id) {
      return res.status(403).render('error', { title: 'Forbidden', message: 'Not your vehicle.' });
    }
    await pool.query('DELETE FROM vehicle_registrations WHERE vehicle_id = ?', [req.params.id]);
    req.session.flash = { type: 'info', msg: 'Registration removed.' };
    res.redirect('/vehicles');
  } catch (e) {
    next(e);
  }
});

// safe delete
router.post('/:id/delete', requireLogin, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [[own]] = await conn.query('SELECT user_id FROM vehicles WHERE vehicle_id = ?', [
      req.params.id,
    ]);
    if (!own || own.user_id !== req.session.user.user_id) {
      return res.status(403).render('error', { title: 'Forbidden', message: 'Not your vehicle.' });
    }
    await conn.beginTransaction();
    // only delete if no reservations reference the vehicle
    const [del] = await conn.query(
      `DELETE FROM vehicles
        WHERE vehicle_id = ?
          AND vehicle_id NOT IN (
            SELECT vehicle_id FROM (SELECT vehicle_id FROM reservations) AS reserved
          )`,
      [req.params.id],
    );
    await conn.commit();
    if (del.affectedRows === 0) {
      req.session.flash = {
        type: 'warning',
        msg: 'Vehicle has reservations — cannot delete. Remove reservations first.',
      };
    } else {
      req.session.flash = { type: 'success', msg: 'Vehicle deleted.' };
    }
    res.redirect('/vehicles');
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_ROW_IS_REFERENCED_2') {
      req.session.flash = { type: 'warning', msg: 'Vehicle still referenced — delete its registration first.' };
      return res.redirect('/vehicles');
    }
    next(e);
  } finally {
    conn.release();
  }
});

module.exports = router;
