require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const expressLayouts = require('express-ejs-layouts');

const pool = require('./config/db');

const app = express();

// ---------- View engine ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// ---------- Body parsers ----------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---------- Static ----------
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Session store (in MySQL so multi-instance works) ----------
const sessionStoreOpts = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  createDatabaseTable: true,
};
if (process.env.CLOUD_SQL_CONNECTION_NAME) {
  sessionStoreOpts.socketPath = `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`;
} else {
  sessionStoreOpts.host = process.env.DB_HOST || '127.0.0.1';
  sessionStoreOpts.port = parseInt(process.env.DB_PORT || '3306', 10);
}
const sessionStore = new MySQLStore(sessionStoreOpts);

app.use(
  session({
    key: 'ps_sid',
    secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  }),
);

// ---------- Flash (roll our own, no extra dep) ----------
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.currentUser = req.session.user || null;
  res.locals.path = req.path;
  next();
});

// ---------- Routes ----------
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/spots');
  res.locals.noContainer = true;
  res.render('home', { title: 'Parking Shark' });
});

app.use('/', require('./routes/auth'));
app.use('/spots', require('./routes/spots'));
app.use('/reservations', require('./routes/reservations'));
app.use('/vehicles', require('./routes/vehicles'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/export', require('./routes/data'));
app.use('/profile', require('./routes/profile'));

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).render('error', { title: 'Not found', message: 'Page not found.' });
});

// ---------- Error handler ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', {
    title: 'Server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message,
  });
});

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  console.log(`Parking Shark listening on http://localhost:${PORT}`);
});
