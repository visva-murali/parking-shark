require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const expressLayouts = require('express-ejs-layouts');

const pool = require('./config/db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// Pass the existing pool so the session store uses the same Cloud SQL connection
const sessionStore = new MySQLStore({ createDatabaseTable: true }, pool);

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
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.currentUser = req.session.user || null;
  res.locals.path = req.path;
  next();
});

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

app.use((req, res) => {
  res.status(404).render('error', { title: 'Not found', message: 'Page not found.' });
});

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
