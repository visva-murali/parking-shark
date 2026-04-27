// profile view and edit, plus phone number management

const express = require('express');
const pool = require('../config/db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireLogin, async (req, res, next) => {
  try {
    const [[user]] = await pool.query(
      `SELECT user_id, computing_id, first_name, last_name, email, created_at
         FROM users WHERE user_id = ?`,
      [req.session.user.user_id],
    );
    const [phones] = await pool.query(
      'SELECT phone_number FROM user_phones WHERE user_id = ?',
      [req.session.user.user_id],
    );
    res.render('dashboard/profile', { title: 'Profile', user, phones });
  } catch (e) {
    next(e);
  }
});

router.post('/', requireLogin, async (req, res, next) => {
  try {
    const { first_name, last_name, email } = req.body;
    await pool.query(
      `UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE user_id = ?`,
      [first_name, last_name, email, req.session.user.user_id],
    );
    req.session.user.first_name = first_name;
    req.session.user.last_name = last_name;
    req.session.user.email = email;
    req.session.flash = { type: 'success', msg: 'Profile updated.' };
    res.redirect('/profile');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      req.session.flash = { type: 'danger', msg: 'Email already in use.' };
      return res.redirect('/profile');
    }
    next(e);
  }
});

router.post('/phones', requireLogin, async (req, res, next) => {
  try {
    await pool.query(
      'INSERT INTO user_phones (user_id, phone_number) VALUES (?, ?)',
      [req.session.user.user_id, req.body.phone_number],
    );
    res.redirect('/profile');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      req.session.flash = { type: 'info', msg: 'That phone number is already on file.' };
      return res.redirect('/profile');
    }
    next(e);
  }
});

router.post('/phones/delete', requireLogin, async (req, res, next) => {
  try {
    await pool.query(
      'DELETE FROM user_phones WHERE user_id = ? AND phone_number = ?',
      [req.session.user.user_id, req.body.phone_number],
    );
    res.redirect('/profile');
  } catch (e) {
    next(e);
  }
});

module.exports = router;
