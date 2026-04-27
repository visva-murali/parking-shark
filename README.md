# Parking Shark

CS 4750 — Database Systems · Spring 2026 · Final Project

Peer-to-peer driveway parking marketplace for Charlottesville / UVA.

**Team**
- Adithya Balasubramaniam (rfb3mg)
- Rohan Singh (psw2uw)
- Angad Brar (zqq4hx)
- Visvajit Murali (dpc8jy)

---

## Live deployment (GCP)

| | |
|---|---|
| **App URL** | https://parkingsharkuva.ue.r.appspot.com |
| **GCP Project** | `parkingsharkuva` |
| **Database** | Cloud SQL — MySQL 8.0 — instance `ps-mysql` (us-central1) |
| **App Engine** | Standard environment — Node.js 20 — region us-east1 |

> Use the live URL for demos. The database is centrally hosted on GCP so all team members and graders hit the same data.

---

## Stack

- **Frontend:** EJS templates + Bootstrap 5 (CDN)
- **Backend:** Node.js 20 + Express 4
- **Database:** MySQL 8 (Cloud SQL on GCP)
- **Driver:** `mysql2/promise` (parameterized queries only)
- **Auth:** `bcrypt` (cost 12) + `express-session` + session store in MySQL via `express-mysql-session`

---

## Repo layout

```
app.js                    Express entry point
app.yaml                  Google App Engine deployment config
config/db.js              MySQL connection pool (supports local + Cloud SQL socket)
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
  schema.sql              Tables + seed data + trigger + stored proc + check constraints
  migration_auth.sql      Adds password_hash + role columns
  grants.sql              GRANT/REVOKE for ps_app and ps_dev
  grants_gcp.sql          GCP-compatible grants (used during initial setup)
deploy/
  app.yaml                Original App Engine config template (use root app.yaml to deploy)
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
mysql -u root -p < sql/grants.sql     # edit REPLACE_WITH_STRONG_PW first
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
npm run dev      # with nodemon (auto-restart on changes)
# or
npm start
```

Open http://localhost:3000

### Seed accounts

All seed users have password `password123`. Log in with any of these:

| Email | Name | Role |
|---|---|---|
| `ac@virginia.edu` | Alice Chen | admin + host |
| `bd@virginia.edu` | Brandon Davis | host |
| `fh@virginia.edu` | Frank Harris | renter |
| `gi@virginia.edu` | Grace Ingram | renter |

See `sql/schema.sql` §3.1 for all 10 seed users.

---

## GCP deployment

### Prerequisites

- `gcloud` CLI installed and authenticated (`gcloud auth login`)
- Access to the `parkingsharkuva` GCP project (ask Visvajit to add you — see "Sharing access" below)

### Deploy a change

From the project root:

```bash
gcloud config set project parkingsharkuva
gcloud app deploy app.yaml --quiet
```

That's it. App Engine uploads changed files, builds, and shifts traffic to the new version automatically (~3 min).

### View live logs

```bash
gcloud app logs read --service=default
```

### Sharing access with teammates

Have Visvajit run (replace with each teammate's Google account email):

```bash
gcloud projects add-iam-policy-binding parkingsharkuva \
  --member="user:TEAMMATE@gmail.com" \
  --role="roles/editor"
```

Once added, the teammate can see the project at console.cloud.google.com and deploy.

### Cloud SQL (database)

- **Instance:** `ps-mysql` — `parkingsharkuva:us-central1:ps-mysql`
- **Public IP:** `34.57.34.113`
- **App connects via:** Cloud SQL unix socket (configured automatically by App Engine)
- **App DB user:** `ps_app` (limited DML only — see `sql/grants.sql`)

To connect locally for debugging (requires your IP to be in the authorized networks list):

```bash
mysql -u root -p'<root-pw>' -h 34.57.34.113 parking_shark
```

### Environment variables in production

All secrets live in `app.yaml` (not committed to git — `app.yaml` is in `.gitignore`).
The key variables are:

| Variable | Purpose |
|---|---|
| `CLOUD_SQL_CONNECTION_NAME` | Tells the app to use unix socket instead of TCP |
| `DB_USER` / `DB_PASS` | App DB credentials |
| `SESSION_SECRET` | Express session signing key |
| `NODE_ENV=production` | Enables secure cookies and production error messages |

---

## How this meets the rubric

| Requirement | Points | Implementation |
|---|---|---|
| 10+ normalized tables used | 10 | 13 tables, all queried in routes |
| Proposed features | 5 | Spot finder, list driveway, reservations, extend/cancel, date+price filter |
| Dynamic UI | 5 | (1) Live cost preview on booking form; (2) Live price-range slider on browse (client-side, no reload); (3) Inline status buttons on host dashboard via `fetch` |
| Retrieve | 15 | 15+ SELECT queries in `routes/spots.js`, `routes/dashboard.js`, `routes/reservations.js`, `routes/profile.js`, `routes/data.js` |
| Add | 15 | Register user, list spot, add vehicle, `CALL create_booking(...)`, add review, add availability window, add phone |
| Update | 15 | Edit spot, confirm/complete/cancel reservation, extend reservation, mark payment paid, update profile, verify vehicle, update review |
| Delete | 15 | Delete spot, delete photo, delete availability window, delete phone, delete vehicle, delete vehicle registration, delete review, delete cancelled reservation |
| Extra feature (sort + search + export) | 25 | Search by street/zip/city; filter by type, max price, date range; sort price asc/desc/newest; CSV export at `/export/reservations.csv` and `/export/host-bookings.csv` |
| Multi-user | 15 | MySQL session store (`express-mysql-session`) shared across instances; `prevent_double_booking` trigger prevents concurrent conflicts |
| Returning user | 15 | Persistent sessions; personalized renter/host dashboards filtered by `req.session.user.user_id` |
| DB-level security | 10 | `sql/grants.sql` — `ps_app` has DML only + EXECUTE on stored proc; `ps_dev` has full dev access; DDL/DROP/ALTER/TRIGGER explicitly revoked from `ps_app` |
| App-level security | 10 | bcrypt cost 12; `requireLogin` / `requireSpotOwner` / `requireReservationOwner` middleware; parameterized queries everywhere; `httpOnly` + `secure` session cookies |
| Advanced SQL | (Milestone 2) | `prevent_double_booking` trigger; `create_booking` stored procedure; 5 CHECK constraints (`chk_rating_range`, `chk_hourly_rate_positive`, `chk_payment_status_values`, `chk_availability_kind_values`, `chk_reservation_time_order`) |
| **GCP extra credit** | **+10** | Database on Cloud SQL MySQL 8 ✓; App on App Engine Standard ✓ |

---

## Advanced SQL in the app

### 1. Trigger — `prevent_double_booking`
**Where it fires:** `BEFORE INSERT` on `reservations`
**How the app uses it:** `routes/reservations.js` — the `POST /reservations` route calls the `create_booking` stored procedure which inserts a reservation. If the spot is already booked for the requested window, the trigger raises `SQLSTATE 45000` and the route catches the error, returning a user-friendly flash message.

### 2. Stored procedure — `create_booking`
**Called from:** `routes/reservations.js` via `CALL create_booking(?, ?, ?, ?, ?, ?, @id)`
**What it does:** Atomically (1) fetches the current hourly rate, (2) calculates total cost, (3) checks for booking conflicts, (4) inserts the reservation with status Pending, (5) inserts a Pending payment record, (6) returns the new `reservation_id` via OUT parameter — all inside a single transaction.

### 3. CHECK constraints
Five constraints enforce data integrity at the database level regardless of application-layer validation:
- `chk_rating_range` — rating must be 1–5
- `chk_hourly_rate_positive` — hourly_rate > 0
- `chk_payment_status_values` — payment_status IN ('Pending','Paid','Refunded','Failed')
- `chk_availability_kind_values` — availability_kind IN ('Available','Blocked')
- `chk_reservation_time_order` — end_time > start_time

---

## Database security

### DB-level (`sql/grants.sql`)

Two MySQL accounts:

**`ps_app`** (used by the Node.js server):
- SELECT, INSERT, UPDATE, DELETE on all transactional tables
- SELECT only on lookup tables (`spot_types`, `reservation_statuses`)
- EXECUTE on `parking_shark.create_booking`
- SELECT, INSERT, UPDATE, DELETE, CREATE on `parking_shark.sessions` (session store)
- DDL operations explicitly revoked: DROP, ALTER, CREATE VIEW, CREATE ROUTINE, ALTER ROUTINE, TRIGGER, REFERENCES, GRANT OPTION

**`ps_dev`** (team members):
- ALL PRIVILEGES on `parking_shark.*`

### App-level (`middleware/auth.js`, `routes/auth.js`)

| Mechanism | Implementation |
|---|---|
| Password hashing | `bcrypt.hash(password, 12)` on register; `bcrypt.compare` on login |
| Session auth | `express-session` + `express-mysql-session`; `req.session.regenerate()` on login to prevent session fixation |
| Route guards | `requireLogin` — redirects to /login; `requireSpotOwner` — queries DB to confirm session user owns the spot; `requireReservationOwner` — same for reservations |
| Parameterized queries | All SQL uses `pool.query('... WHERE id = ?', [id])` — no string concatenation |
| Secure cookies | `httpOnly: true`, `sameSite: 'lax'`, `secure: true` in production |
| No user enumeration | Login failure returns generic "Invalid credentials" regardless of whether email exists |

---

## Development notes

- **Never** use string concatenation in SQL. Always `pool.query('... WHERE x = ?', [val])`.
- **Never** commit `.env`. Use `.env.example` as the template.
- **Never** commit `app.yaml` (it contains production secrets). It is in `.gitignore`.
- When the app user (`ps_app`) gets a permission denied error, that's DB-level security working correctly. Check `sql/grants.sql` and add the minimum privilege needed.
- The `prevent_double_booking` trigger fires before every reservation INSERT. If you see a booking failure with `SQLSTATE 45000`, the trigger rejected an overlap — this is expected behavior.
- To redeploy to GCP after any code change: `gcloud app deploy app.yaml --quiet`
