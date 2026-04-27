# Parking Shark

CS 4750 — Database Systems · Spring 2026 · Final Project

Peer-to-peer driveway parking marketplace for Charlottesville / UVA.

**Team**
- Adithya Balasubramaniam (rfb3mg)
- Rohan Singh (psw2uw)
- Angad Brar (zqq4hx)
- Visvajit Murali (dpc8jy)

---

## Stack

- **Frontend:** EJS templates + Bootstrap 5 (CDN)
- **Backend:** Node.js 20 + Express 4
- **Database:** MySQL 8
- **Driver:** `mysql2/promise` (parameterized queries only)
- **Auth:** `bcrypt` (cost 12) + `express-session` + session store in MySQL via `express-mysql-session`

## Repo layout

```
app.js                    Express entry
config/db.js              MySQL connection pool
middleware/auth.js        requireLogin, requireSpotOwner, requireReservationOwner
routes/
  auth.js                 Register, login, logout
  spots.js                Browse, search, filter, sort, detail, create, edit, delete
  reservations.js         Book (stored proc), list, extend, cancel, complete, review
  vehicles.js             Add, verify, delete
  dashboard.js            Renter + host dashboards
  profile.js              Profile, phones
  data.js                 CSV export
views/                    EJS templates
public/                   CSS + JS
sql/
  schema.sql              Tables + stored proc + trigger + check constraints (Milestone 2)
  migration_auth.sql      Adds password_hash + role columns
  grants.sql              GRANT/REVOKE for ps_app and ps_dev
```

---

## Local development

### 1. Install MySQL 8

```bash
# macOS
brew install mysql
brew services start mysql
```

### 2. Install Node dependencies

```bash
npm install
```

### 3. Create the database

Connect as root and apply in this order:

```bash
mysql -u root -p < sql/schema.sql
mysql -u root -p < sql/migration_auth.sql
mysql -u root -p < sql/grants.sql     # sets ps_app / ps_dev passwords - EDIT FIRST
```

> **Before running `grants.sql`**, replace both occurrences of `REPLACE_WITH_STRONG_PW` with actual passwords.

### 4. Configure environment

```bash
cp .env.example .env
# edit .env — set DB_PASS (ps_app password) and a random SESSION_SECRET
# generate a secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Run

```bash
npm run dev      # with nodemon
# or
npm start
```

Open http://localhost:3000

### Seed accounts

The seed data in `sql/schema.sql` + `sql/migration_auth.sql` creates 10 users, all with password `password123`. Log in with any of these emails:

- `alicia.chen@virginia.edu` (Alicia Chen — admin + host)
- `bd@virginia.edu` (Brandon Davis — host)
- `fh@virginia.edu` (Frank Harris — renter)
- … see `sql/schema.sql` §3.1

---

## How this meets the rubric

| Requirement (points) | Implementation |
|---|---|
| 10 tables used | 13 normalized tables, all touched. See `routes/` for coverage. |
| 5 pts proposed features | Spot finder, list driveway, extend/cancel, filter by date+price |
| 5 pts dynamic UI | Live cost preview on booking form; inline status update on host dashboard |
| 15 retrieve | `routes/spots.js`, `routes/dashboard.js`, §4.x queries |
| 15 add | Register, list spot, add vehicle, `CALL create_booking(...)`, review |
| 15 update | §5.1–5.10 wired in `routes/spots.js`, `routes/reservations.js`, `routes/vehicles.js`, `routes/profile.js` |
| 15 delete | §6.1–6.7 wired in same |
| 25 extra feature | Search + filter + sort on `/spots`; CSV export for renter and host |
| 15 multi-user | Shared MySQL pool + session store in MySQL |
| 15 returning user | Sessions; all dashboards filtered by `req.session.user.user_id` |
| 10 DB-level security | `sql/grants.sql` — `ps_app` with DML only, `ps_dev` for developers |
| 10 app-level security | bcrypt, sessions, middleware guards, parameterized queries |
| Advanced SQL | `prevent_double_booking` trigger + `create_booking` procedure + CHECK constraints |

---

## Development notes for the team

- **Never** use string concatenation in SQL. Always `pool.query('... WHERE x = ?', [val])`.
- **Never** commit `.env`. Use `.env.example` as the template.
- When the app user (`ps_app`) gets a permission denied error, that's the DB-level security working. Check `sql/grants.sql` and add the minimum privilege needed.
- The `prevent_double_booking` trigger fires before every reservation INSERT. If you're debugging a booking failure with `SQLSTATE 45000`, that's the trigger rejecting an overlap.
