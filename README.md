# Parking Shark

CS 4750 Database Systems final project.

Parking Shark is a small web app for renting driveway/parking spots around UVA. People can make an account, list a spot, add their car, book a spot, and manage reservations.

Team:
- Adithya Balasubramaniam (rfb3mg)
- Rohan Singh (psw2uw)
- Angad Brar (zqq4hx)
- Visvajit Murali (dpc8jy)

Live app for demo:

https://parkingsharkuva.ue.r.appspot.com

## What We Used

- Node / Express
- EJS templates
- Bootstrap
- MySQL
- bcrypt for passwords
- express-session with MySQL session storage

## Main Files

```text
app.js                  starts the Express app
config/db.js            database connection
middleware/auth.js      login and owner checks
routes/                 app routes
views/                  EJS pages
public/                 CSS, JS, favicon files
sql/schema.sql          tables, seed data, trigger, procedure, constraints
sql/migration_auth.sql  adds password hashes and roles
sql/grants.sql          database users/permissions
deploy/app.yaml         App Engine config template
```

The original proposal PDF is also in the repo:

```text
ParkingShark_-_Database_Systems_Proposal.pdf
```

## Running It Locally

Install packages:

```bash
npm install
```

Set up MySQL:

```bash
mysql -u root -p < sql/schema.sql
mysql -u root -p < sql/migration_auth.sql
```

For the database user permissions, edit `sql/grants.sql` first and replace `REPLACE_WITH_STRONG_PW`, then run:

```bash
mysql -u root -p < sql/grants.sql
```

Create a `.env` file:

```bash
cp .env.example .env
```

Fill in the database password and session secret.

Start the app:

```bash
npm run dev
```

or:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

## Test Logins

The seed users use:

```text
password123
```

Some accounts:

```text
ac@virginia.edu
bd@virginia.edu
fh@virginia.edu
gi@virginia.edu
```

## GCP Stuff

The app is deployed on Google App Engine, and the database is on Cloud SQL.

Current demo setup:

```text
GCP project: parkingsharkuva
Cloud SQL instance: ps-mysql
Database: parking_shark
App URL: https://parkingsharkuva.ue.r.appspot.com
```

To deploy again, use the App Engine config that has the real environment variables. The checked-in `deploy/app.yaml` is just the template version.

```bash
gcloud config set project parkingsharkuva
gcloud app deploy app.yaml
```

## Features

Things the app can do:

- register and log in
- browse parking spots
- search/filter/sort spots
- list a new spot
- edit/deactivate/delete your own spot
- add vehicles
- book a reservation
- confirm/cancel/complete reservations
- mark payments paid
- leave and edit reviews
- export reservations as CSV

## Database Stuff

We use 13 tables:

```text
users
user_phones
vehicles
vehicle_registrations
addresses
spot_types
spots
spot_photos
availability_windows
reservation_statuses
reservations
payments
reviews
```

The main advanced SQL parts are:

- `prevent_double_booking` trigger, so two people cannot book the same spot at the same time
- `create_booking` stored procedure, used when someone books a spot
- check constraints for ratings, prices, payment status, availability type, and reservation times

The app user in MySQL is `ps_app`. It has limited permissions for the web app. The dev user is `ps_dev`.

## Demo Ideas

A quick demo path:

1. Log in as one user and browse spots.
2. Use the search/filter/sort controls.
3. Add a car if needed.
4. Book a spot.
5. Log in as the host and confirm/complete the reservation.
6. Go back as the renter and leave a review.
7. Show the CSV export.

That covers the main CRUD pieces plus the database trigger/procedure.
