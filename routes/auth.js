// authentication routes, bcrypt hashed passwords, parameterized queries, generic failure message to avoid user enumeration

const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');

const router = express.Router();

router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Sign up', errors: [], form: {} });
});

router.post(
  '/register',
  body('computing_id').trim().isLength({ min: 3, max: 32 }),
  body('first_name').trim().isLength({ min: 1, max: 64 }),
  body('last_name').trim().isLength({ min: 1, max: 64 }),
  body('email').trim().isEmail().isLength({ max: 255 }),
  body('password').isLength({ min: 8, max: 128 }),
  body('phone_number').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('auth/register', {
        title: 'Sign up',
        errors: errors.array(),
        form: req.body,
      });
    }

    const { computing_id, first_name, last_name, email, password, phone_number } = req.body;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const hash = await bcrypt.hash(password, 12);
      const [result] = await conn.query(
        `INSERT INTO users
           (computing_id, first_name, last_name, email, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, ?, 'user', NOW())`,
        [computing_id, first_name, last_name, email, hash],
      );
      const userId = result.insertId;
      if (phone_number) {
        await conn.query(
          'INSERT INTO user_phones (user_id, phone_number) VALUES (?, ?)',
          [userId, phone_number],
        );
      }
      await conn.commit();

      req.session.user = {
        user_id: userId,
        computing_id,
        first_name,
        last_name,
        email,
        role: 'user',
      };
      req.session.flash = { type: 'success', msg: 'Account created. Welcome!' };
      res.redirect('/spots');
    } catch (e) {
      await conn.rollback();
      if (e.code === 'ER_DUP_ENTRY') {
        return res.render('auth/register', {
          title: 'Sign up',
          errors: [{ msg: 'Email or computing ID already in use.' }],
          form: req.body,
        });
      }
      next(e);
    } finally {
      conn.release();
    }
  },
);

router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Log in', error: null, form: {} });
});

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query(
      `SELECT user_id, computing_id, first_name, last_name, email, role, password_hash
         FROM users
        WHERE email = ?`,
      [email],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.render('auth/login', {
        title: 'Log in',
        error: 'Invalid email or password.',
        form: req.body,
      });
    }
    // regenerate session id to prevent session fixation
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = {
        user_id: user.user_id,
        computing_id: user.computing_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
      };
      req.session.flash = { type: 'success', msg: `Welcome back, ${user.first_name}!` };
      res.redirect('/spots');
    });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('ps_sid');
    res.redirect('/');
  });
});

module.exports = router;
