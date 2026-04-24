-- =============================================================
-- Parking Shark - MySQL Database
-- CS 4750 Project Milestone 2: DB Setup and SQL
-- Team: Adithya Balasubramaniam (rfb3mg), Rohan Singh (psw2uw),
--       Angad Brar (zqq4hx), Visvajit Murali (dpc8jy)
-- =============================================================

-- =============================================================
-- SECTION 1: CREATE TABLES (Database Setup)
-- =============================================================

CREATE DATABASE IF NOT EXISTS parking_shark;
USE parking_shark;

-- 1.1 users
CREATE TABLE users (
    user_id     INT PRIMARY KEY AUTO_INCREMENT,
    computing_id VARCHAR(32) NOT NULL UNIQUE,
    first_name  VARCHAR(64) NOT NULL,
    last_name   VARCHAR(64) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    created_at  DATETIME NOT NULL
);

-- 1.2 user_phones  (multi-valued attribute of users)
CREATE TABLE user_phones (
    user_id      INT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    PRIMARY KEY (user_id, phone_number),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 1.3 vehicles
CREATE TABLE vehicles (
    vehicle_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id    INT NOT NULL,
    make       VARCHAR(64) NOT NULL,
    model      VARCHAR(64) NOT NULL,
    year       SMALLINT NULL,
    color      VARCHAR(32) NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 1.4 vehicle_registrations
CREATE TABLE vehicle_registrations (
    vehicle_id    INT PRIMARY KEY,
    license_plate VARCHAR(16) NOT NULL UNIQUE,
    plate_state   CHAR(2) NOT NULL,
    expires_on    DATE NULL,
    is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at   DATETIME NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
);

-- 1.5 addresses
CREATE TABLE addresses (
    address_id INT PRIMARY KEY AUTO_INCREMENT,
    street     VARCHAR(255) NOT NULL,
    city       VARCHAR(64) NOT NULL,
    state      CHAR(2) NOT NULL,
    zip_code   VARCHAR(10) NOT NULL
);

-- 1.6 spot_types  (lookup table)
CREATE TABLE spot_types (
    spot_type_id INT PRIMARY KEY AUTO_INCREMENT,
    type_name    VARCHAR(32) NOT NULL UNIQUE
);

-- 1.7 spots
CREATE TABLE spots (
    spot_id      INT PRIMARY KEY AUTO_INCREMENT,
    host_user_id INT NOT NULL,
    address_id   INT NOT NULL,
    spot_type_id INT NOT NULL,
    hourly_rate  DECIMAL(8,2) NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    instructions TEXT NULL,
    FOREIGN KEY (host_user_id) REFERENCES users(user_id),
    FOREIGN KEY (address_id)   REFERENCES addresses(address_id),
    FOREIGN KEY (spot_type_id) REFERENCES spot_types(spot_type_id)
);

-- 1.8 spot_photos
CREATE TABLE spot_photos (
    photo_id    INT PRIMARY KEY AUTO_INCREMENT,
    spot_id     INT NOT NULL,
    photo_url   TEXT NOT NULL,
    uploaded_at DATETIME NOT NULL,
    FOREIGN KEY (spot_id) REFERENCES spots(spot_id)
);

-- 1.9 availability_windows
CREATE TABLE availability_windows (
    window_id         INT PRIMARY KEY AUTO_INCREMENT,
    spot_id           INT NOT NULL,
    start_time        DATETIME NOT NULL,
    end_time          DATETIME NOT NULL,
    availability_kind VARCHAR(16) NOT NULL,
    FOREIGN KEY (spot_id) REFERENCES spots(spot_id)
);

-- 1.10 reservation_statuses  (lookup table)
CREATE TABLE reservation_statuses (
    status_id   INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(32) NOT NULL UNIQUE
);

-- 1.11 reservations
CREATE TABLE reservations (
    reservation_id       INT PRIMARY KEY AUTO_INCREMENT,
    spot_id              INT NOT NULL,
    renter_user_id       INT NOT NULL,
    vehicle_id           INT NOT NULL,
    status_id            INT NOT NULL,
    start_time           DATETIME NOT NULL,
    end_time             DATETIME NOT NULL,
    hourly_rate_at_booking DECIMAL(8,2) NOT NULL,
    total_cost           DECIMAL(10,2) NOT NULL,
    created_at           DATETIME NOT NULL,
    FOREIGN KEY (spot_id)          REFERENCES spots(spot_id),
    FOREIGN KEY (renter_user_id)   REFERENCES users(user_id),
    FOREIGN KEY (vehicle_id)       REFERENCES vehicles(vehicle_id),
    FOREIGN KEY (status_id)        REFERENCES reservation_statuses(status_id)
);

-- 1.12 payments
CREATE TABLE payments (
    payment_id      INT PRIMARY KEY AUTO_INCREMENT,
    reservation_id  INT NOT NULL UNIQUE,
    amount          DECIMAL(10,2) NOT NULL,
    paid_at         DATETIME NULL,
    method          VARCHAR(32) NULL,
    payment_status  VARCHAR(32) NOT NULL,
    FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);

-- 1.13 reviews
CREATE TABLE reviews (
    reservation_id INT PRIMARY KEY,
    rating         TINYINT NOT NULL,
    comment        TEXT NULL,
    created_at     DATETIME NOT NULL,
    FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);

-- =============================================================
-- SECTION 2: SEED / LOOKUP DATA
-- =============================================================

-- 2.1 Spot types
INSERT INTO spot_types (type_name) VALUES
    ('Driveway'),
    ('Garage'),
    ('Lawn'),
    ('Street-side'),
    ('Lot');

-- 2.2 Reservation statuses
INSERT INTO reservation_statuses (status_name) VALUES
    ('Pending'),
    ('Confirmed'),
    ('Completed'),
    ('Cancelled');

-- =============================================================
-- SECTION 3: SAMPLE / POPULATION DATA  (INSERT)
-- =============================================================

-- 3.1 Users
INSERT INTO users (computing_id, first_name, last_name, email, created_at) VALUES
    ('abc1de',  'Alice',   'Chen',     'ac@virginia.edu',  '2025-08-20 10:00:00'),
    ('bcd2ef',  'Brandon', 'Davis',    'bd@virginia.edu',  '2025-08-21 11:00:00'),
    ('cde3fg',  'Carla',   'Evans',    'ce@virginia.edu',  '2025-09-01 09:00:00'),
    ('def4gh',  'Daniel',  'Foster',   'df@virginia.edu',  '2025-09-05 14:00:00'),
    ('efg5hi',  'Emma',    'Garcia',   'eg@virginia.edu',  '2025-09-10 08:30:00'),
    ('fgh6ij',  'Frank',   'Harris',   'fh@virginia.edu',  '2025-09-12 12:00:00'),
    ('ghi7jk',  'Grace',   'Ingram',   'gi@virginia.edu',  '2025-09-15 16:00:00'),
    ('hij8kl',  'Henry',   'Johnson',  'hj@virginia.edu',  '2025-09-18 10:45:00'),
    ('ijk9lm',  'Iris',    'Kim',      'ik@virginia.edu',  '2025-09-20 13:00:00'),
    ('jkl0mn',  'James',   'Lee',      'jl@virginia.edu',  '2025-09-22 09:15:00');

-- 3.2 User phones
INSERT INTO user_phones (user_id, phone_number) VALUES
    (1, '434-555-0101'),
    (2, '434-555-0102'),
    (2, '434-555-0199'),
    (3, '434-555-0103'),
    (4, '434-555-0104'),
    (5, '434-555-0105'),
    (6, '434-555-0106'),
    (7, '434-555-0107'),
    (8, '434-555-0108'),
    (9, '434-555-0109'),
    (10,'434-555-0110');

-- 3.3 Vehicles
INSERT INTO vehicles (user_id, make, model, year, color) VALUES
    (1, 'Toyota',  'Camry',    2020, 'Silver'),
    (2, 'Honda',   'Civic',    2019, 'Blue'),
    (3, 'Ford',    'Mustang',  2021, 'Red'),
    (4, 'Chevy',   'Malibu',   2018, 'Black'),
    (5, 'Tesla',   'Model 3',  2022, 'White'),
    (6, 'Subaru',  'Outback',  2020, 'Green'),
    (7, 'BMW',     '3 Series', 2021, 'Gray'),
    (8, 'Nissan',  'Altima',   2017, 'Bronze'),
    (9, 'Hyundai', 'Elantra',  2020, 'Navy'),
    (10,'Mazda',   'CX-5',     2019, 'White');

-- 3.4 Vehicle registrations
INSERT INTO vehicle_registrations (vehicle_id, license_plate, plate_state, expires_on, is_verified, verified_at) VALUES
    (1,  'VA-ABC123',  'VA', '2026-12-31', TRUE,  '2025-09-01 10:00:00'),
    (2,  'VA-DEF456',  'VA', '2026-06-30', TRUE,  '2025-09-02 11:00:00'),
    (3,  'VA-GHI789',  'VA', '2026-09-30', FALSE, NULL),
    (4,  'MD-JKL012',  'MD', '2025-12-31', TRUE,  '2025-09-05 09:00:00'),
    (5,  'VA-MNO345',  'VA', '2027-03-31', TRUE,  '2025-09-10 14:00:00'),
    (6,  'NC-PQR678',  'NC', '2026-01-31', FALSE, NULL),
    (7,  'VA-STU901',  'VA', '2026-11-30', TRUE,  '2025-09-15 13:00:00'),
    (8,  'VA-VWX234',  'VA', '2026-08-31', TRUE,  '2025-09-18 10:00:00'),
    (9,  'VA-YZA567',  'VA', '2026-05-31', FALSE, NULL),
    (10, 'VA-BCD890',  'VA', '2026-10-31', TRUE,  '2025-09-22 12:00:00');

-- 3.5 Addresses (Charlottesville / UVA area)
INSERT INTO addresses (street, city, state, zip_code) VALUES
    ('100 Chancellor St',        'Charlottesville', 'VA', '22903'),
    ('214 14th St NW',           'Charlottesville', 'VA', '22903'),
    ('312 Wertland St',          'Charlottesville', 'VA', '22903'),
    ('405 Alderman Rd',          'Charlottesville', 'VA', '22903'),
    ('520 Rugby Rd',             'Charlottesville', 'VA', '22903'),
    ('618 McCormick Rd',         'Charlottesville', 'VA', '22904'),
    ('720 Jefferson Park Ave',   'Charlottesville', 'VA', '22903'),
    ('840 Brandon Ave',          'Charlottesville', 'VA', '22903'),
    ('901 Emmet St N',           'Charlottesville', 'VA', '22903'),
    ('1010 Fontaine Ave',        'Charlottesville', 'VA', '22903'),
    ('1125 University Ave',      'Charlottesville', 'VA', '22903'),
    ('1230 Rose Hill Dr',        'Charlottesville', 'VA', '22903'),
    ('1340 Barracks Rd',         'Charlottesville', 'VA', '22903'),
    ('1415 Gordon Ave',          'Charlottesville', 'VA', '22903'),
    ('1505 Grady Ave',           'Charlottesville', 'VA', '22903');

-- 3.6 Spots (hosts: users 1,2,3,4,5)
INSERT INTO spots (host_user_id, address_id, spot_type_id, hourly_rate, is_active, instructions) VALUES
    (1, 1,  1, 5.00,  TRUE,  'Pull into driveway on left. Do not block garage.'),
    (1, 2,  2, 8.00,  TRUE,  'Code is 1234 for garage door. Park on lower level.'),
    (2, 3,  1, 4.50,  TRUE,  'Gravel driveway. Keep gate closed.'),
    (2, 4,  3, 3.50,  TRUE,  'Please park on the grass strip to the right.'),
    (3, 5,  1, 6.00,  TRUE,  'Ring doorbell on arrival. Back driveway spot.'),
    (3, 6,  4, 3.00,  FALSE, 'Street-side spot. Currently unavailable.'),
    (4, 7,  2, 10.00, TRUE,  'Heated garage. Swipe card included in host message.'),
    (4, 8,  1, 5.50,  TRUE,  'Concrete driveway. Watch for low-hanging branch.'),
    (5, 9,  5, 7.00,  TRUE,  'Open lot. Park in any space marked with green cone.'),
    (5, 10, 1, 4.00,  TRUE,  'Single-car driveway. Backup slowly.'),
    (1, 11, 1, 6.50,  TRUE,  'Double-wide driveway. Room for two cars.'),
    (2, 12, 3, 3.50,  TRUE,  'Large lawn. Avoid flower bed on east side.'),
    (3, 13, 2, 9.00,  TRUE,  'Secure garage with camera. Height limit 6ft 8in.'),
    (4, 14, 1, 5.00,  TRUE,  'Gated driveway. Gate code will be sent via message.'),
    (5, 15, 5, 6.00,  TRUE,  'Shared lot. One designated space for renters.');

-- 3.7 Spot photos
INSERT INTO spot_photos (spot_id, photo_url, uploaded_at) VALUES
    (1,  'https://parking-shark.s3.amazonaws.com/spots/1/photo1.jpg',  '2025-09-01 10:00:00'),
    (1,  'https://parking-shark.s3.amazonaws.com/spots/1/photo2.jpg',  '2025-09-01 10:05:00'),
    (2,  'https://parking-shark.s3.amazonaws.com/spots/2/photo1.jpg',  '2025-09-02 11:00:00'),
    (3,  'https://parking-shark.s3.amazonaws.com/spots/3/photo1.jpg',  '2025-09-03 09:00:00'),
    (4,  'https://parking-shark.s3.amazonaws.com/spots/4/photo1.jpg',  '2025-09-04 14:00:00'),
    (5,  'https://parking-shark.s3.amazonaws.com/spots/5/photo1.jpg',  '2025-09-05 08:00:00'),
    (7,  'https://parking-shark.s3.amazonaws.com/spots/7/photo1.jpg',  '2025-09-07 12:00:00'),
    (9,  'https://parking-shark.s3.amazonaws.com/spots/9/photo1.jpg',  '2025-09-09 16:00:00'),
    (11, 'https://parking-shark.s3.amazonaws.com/spots/11/photo1.jpg', '2025-09-11 10:00:00'),
    (13, 'https://parking-shark.s3.amazonaws.com/spots/13/photo1.jpg', '2025-09-13 13:00:00'),
    (15, 'https://parking-shark.s3.amazonaws.com/spots/15/photo1.jpg', '2025-09-15 11:00:00'),
    (15, 'https://parking-shark.s3.amazonaws.com/spots/15/photo2.jpg', '2025-09-15 11:10:00');

-- 3.8 Availability windows
INSERT INTO availability_windows (spot_id, start_time, end_time, availability_kind) VALUES
    (1,  '2025-10-01 08:00:00', '2025-10-01 18:00:00', 'Available'),
    (1,  '2025-10-02 08:00:00', '2025-10-02 18:00:00', 'Available'),
    (1,  '2025-10-05 10:00:00', '2025-10-05 14:00:00', 'Blocked'),
    (2,  '2025-10-01 00:00:00', '2025-10-31 23:59:59', 'Available'),
    (3,  '2025-10-01 07:00:00', '2025-10-01 20:00:00', 'Available'),
    (3,  '2025-10-03 07:00:00', '2025-10-03 20:00:00', 'Available'),
    (4,  '2025-10-01 06:00:00', '2025-10-01 22:00:00', 'Available'),
    (5,  '2025-10-01 08:00:00', '2025-10-07 18:00:00', 'Available'),
    (7,  '2025-10-01 00:00:00', '2025-12-31 23:59:59', 'Available'),
    (8,  '2025-10-01 09:00:00', '2025-10-01 17:00:00', 'Available'),
    (9,  '2025-10-01 06:00:00', '2025-10-31 22:00:00', 'Available'),
    (10, '2025-10-01 08:00:00', '2025-10-01 20:00:00', 'Available'),
    (11, '2025-10-01 07:00:00', '2025-10-31 19:00:00', 'Available'),
    (12, '2025-10-01 08:00:00', '2025-10-31 18:00:00', 'Available'),
    (13, '2025-10-01 00:00:00', '2025-12-31 23:59:59', 'Available'),
    (14, '2025-10-01 08:00:00', '2025-10-31 20:00:00', 'Available'),
    (15, '2025-10-01 06:00:00', '2025-10-31 22:00:00', 'Available'),
    (1,  '2025-11-01 08:00:00', '2025-11-30 18:00:00', 'Available'),
    (2,  '2025-11-01 00:00:00', '2025-11-30 23:59:59', 'Available'),
    (5,  '2025-11-01 08:00:00', '2025-11-30 18:00:00', 'Available');

-- 3.9 Reservations
INSERT INTO reservations (spot_id, renter_user_id, vehicle_id, status_id, start_time, end_time, hourly_rate_at_booking, total_cost, created_at) VALUES
    (1,  6,  6,  3, '2025-10-01 09:00:00', '2025-10-01 12:00:00', 5.00,  15.00,  '2025-09-28 14:00:00'),
    (2,  7,  7,  3, '2025-10-01 10:00:00', '2025-10-01 14:00:00', 8.00,  32.00,  '2025-09-29 09:00:00'),
    (3,  8,  8,  3, '2025-10-01 08:00:00', '2025-10-01 11:00:00', 4.50,  13.50,  '2025-09-30 10:00:00'),
    (5,  9,  9,  2, '2025-10-03 09:00:00', '2025-10-03 13:00:00', 6.00,  24.00,  '2025-10-01 11:00:00'),
    (7, 10, 10,  2, '2025-10-02 10:00:00', '2025-10-02 16:00:00', 10.00, 60.00,  '2025-09-30 15:00:00'),
    (9,  6,  6,  2, '2025-10-04 07:00:00', '2025-10-04 10:00:00', 7.00,  21.00,  '2025-10-02 08:00:00'),
    (11, 7,  7,  1, '2025-10-05 09:00:00', '2025-10-05 12:00:00', 6.50,  19.50,  '2025-10-03 12:00:00'),
    (13, 8,  8,  1, '2025-10-06 10:00:00', '2025-10-06 13:00:00', 9.00,  27.00,  '2025-10-04 10:00:00'),
    (1,  9,  9,  4, '2025-10-02 09:00:00', '2025-10-02 11:00:00', 5.00,  10.00,  '2025-09-30 16:00:00'),
    (3, 10, 10,  3, '2025-10-03 07:00:00', '2025-10-03 10:00:00', 4.50,  13.50,  '2025-10-01 09:00:00'),
    (4,  6,  6,  3, '2025-10-01 13:00:00', '2025-10-01 17:00:00', 3.50,  14.00,  '2025-09-29 14:00:00'),
    (8,  7,  7,  2, '2025-10-05 10:00:00', '2025-10-05 14:00:00', 5.50,  22.00,  '2025-10-03 11:00:00'),
    (10, 8,  8,  2, '2025-10-06 09:00:00', '2025-10-06 13:00:00', 4.00,  16.00,  '2025-10-04 09:00:00'),
    (14, 9,  9,  1, '2025-10-07 10:00:00', '2025-10-07 14:00:00', 5.00,  20.00,  '2025-10-05 10:00:00'),
    (15,10, 10,  1, '2025-10-08 08:00:00', '2025-10-08 12:00:00', 6.00,  24.00,  '2025-10-06 11:00:00'),
    (2,  6,  6,  3, '2025-10-10 09:00:00', '2025-10-10 13:00:00', 8.00,  32.00,  '2025-10-08 14:00:00'),
    (5,  7,  7,  3, '2025-10-08 08:00:00', '2025-10-08 11:00:00', 6.00,  18.00,  '2025-10-06 09:00:00'),
    (7,  8,  8,  2, '2025-10-09 10:00:00', '2025-10-09 15:00:00', 10.00, 50.00,  '2025-10-07 10:00:00'),
    (12, 9,  9,  3, '2025-10-02 08:00:00', '2025-10-02 12:00:00', 3.50,  14.00,  '2025-09-30 13:00:00'),
    (13, 10, 10, 3, '2025-10-04 09:00:00', '2025-10-04 12:00:00', 9.00,  27.00,  '2025-10-02 12:00:00');

-- 3.10 Payments (for completed & confirmed reservations)
INSERT INTO payments (reservation_id, amount, paid_at, method, payment_status) VALUES
    (1,  15.00,  '2025-10-01 12:05:00', 'Credit Card', 'Paid'),
    (2,  32.00,  '2025-10-01 14:05:00', 'PayPal',      'Paid'),
    (3,  13.50,  '2025-10-01 11:05:00', 'Credit Card', 'Paid'),
    (4,  24.00,  NULL,                   'Credit Card', 'Pending'),
    (5,  60.00,  NULL,                   'Credit Card', 'Pending'),
    (6,  21.00,  NULL,                   'Venmo',       'Pending'),
    (9,  10.00,  '2025-10-02 11:05:00', 'Credit Card', 'Refunded'),
    (10, 13.50,  '2025-10-03 10:05:00', 'Credit Card', 'Paid'),
    (11, 14.00,  '2025-10-01 17:05:00', 'Debit Card',  'Paid'),
    (16, 32.00,  '2025-10-10 13:05:00', 'Credit Card', 'Paid'),
    (17, 18.00,  '2025-10-08 11:05:00', 'PayPal',      'Paid'),
    (19, 14.00,  '2025-10-02 12:05:00', 'Credit Card', 'Paid'),
    (20, 27.00,  '2025-10-04 12:05:00', 'Credit Card', 'Paid');

-- 3.11 Reviews (only for completed reservations: status_id = 3)
INSERT INTO reviews (reservation_id, rating, comment, created_at) VALUES
    (1,  5, 'Great spot! Very convenient location near UVA.', '2025-10-01 15:00:00'),
    (2,  4, 'Clean garage, easy to access.', '2025-10-01 18:00:00'),
    (3,  5, 'Perfect for a quick errand. Highly recommend.', '2025-10-01 14:00:00'),
    (10, 4, 'Good spot, gravel is a bit bumpy but worked fine.', '2025-10-03 13:00:00'),
    (11, 5, 'Huge lawn, plenty of space.', '2025-10-01 20:00:00'),
    (16, 4, 'Garage was clean and well-lit. Will use again.', '2025-10-10 17:00:00'),
    (17, 5, 'Easy booking and fantastic spot near campus.', '2025-10-08 14:00:00'),
    (19, 3, 'Spot was fine but instructions were unclear.', '2025-10-02 16:00:00'),
    (20, 5, 'Best garage spot in Charlottesville. Worth every penny.', '2025-10-04 15:00:00');

-- =============================================================
-- SECTION 4: NON-ADVANCED SQL COMMANDS — RETRIEVE (SELECT)
-- =============================================================

-- 4.1 Get all active spots with address and type (for browse/search page)
SELECT s.spot_id, s.hourly_rate, s.instructions, s.is_active,
       a.street, a.city, a.state, a.zip_code,
       st.type_name,
       u.first_name AS host_first, u.last_name AS host_last
FROM spots s
JOIN addresses a      ON s.address_id   = a.address_id
JOIN spot_types st    ON s.spot_type_id = st.spot_type_id
JOIN users u          ON s.host_user_id = u.user_id
WHERE s.is_active = TRUE
ORDER BY s.hourly_rate ASC;

-- 4.2 Get spots available during a specific time window (no double-booking)
SELECT s.spot_id, s.hourly_rate, a.street, a.city, st.type_name
FROM spots s
JOIN addresses a   ON s.address_id   = a.address_id
JOIN spot_types st ON s.spot_type_id = st.spot_type_id
WHERE s.is_active = TRUE
  AND EXISTS (
      SELECT 1 FROM availability_windows aw
      WHERE aw.spot_id = s.spot_id
        AND aw.availability_kind = 'Available'
        AND aw.start_time <= '2025-10-05 09:00:00'
        AND aw.end_time   >= '2025-10-05 12:00:00'
  )
  AND s.spot_id NOT IN (
      SELECT r.spot_id FROM reservations r
      JOIN reservation_statuses rs ON r.status_id = rs.status_id
      WHERE rs.status_name IN ('Pending','Confirmed')
        AND r.start_time < '2025-10-05 12:00:00'
        AND r.end_time   > '2025-10-05 09:00:00'
  );

-- 4.3 Get spot details by spot_id (for the spot detail/listing page)
SELECT s.spot_id, s.hourly_rate, s.is_active, s.instructions,
       a.street, a.city, a.state, a.zip_code,
       st.type_name,
       u.user_id AS host_id, u.first_name AS host_first, u.last_name AS host_last
FROM spots s
JOIN addresses a   ON s.address_id   = a.address_id
JOIN spot_types st ON s.spot_type_id = st.spot_type_id
JOIN users u       ON s.host_user_id = u.user_id
WHERE s.spot_id = 1;

-- 4.4 Get all photos for a specific spot
SELECT photo_id, photo_url, uploaded_at
FROM spot_photos
WHERE spot_id = 1
ORDER BY uploaded_at ASC;

-- 4.5 Get all reservations for a renter (renter's booking history)
SELECT r.reservation_id, r.start_time, r.end_time, r.total_cost, r.created_at,
       rs.status_name,
       s.spot_id, a.street, a.city,
       v.make, v.model, v.year
FROM reservations r
JOIN reservation_statuses rs ON r.status_id    = rs.status_id
JOIN spots s                 ON r.spot_id       = s.spot_id
JOIN addresses a             ON s.address_id    = a.address_id
JOIN vehicles v              ON r.vehicle_id    = v.vehicle_id
WHERE r.renter_user_id = 6
ORDER BY r.start_time DESC;

-- 4.6 Get all reservations for a host's spots (host management dashboard)
SELECT r.reservation_id, r.start_time, r.end_time, r.total_cost,
       rs.status_name,
       u.first_name AS renter_first, u.last_name AS renter_last, u.email,
       s.spot_id, a.street,
       v.make, v.model, vr.license_plate
FROM reservations r
JOIN reservation_statuses rs ON r.status_id       = rs.status_id
JOIN users u                 ON r.renter_user_id   = u.user_id
JOIN spots s                 ON r.spot_id           = s.spot_id
JOIN addresses a             ON s.address_id        = a.address_id
JOIN vehicles v              ON r.vehicle_id        = v.vehicle_id
LEFT JOIN vehicle_registrations vr ON v.vehicle_id = vr.vehicle_id
WHERE s.host_user_id = 1
ORDER BY r.start_time DESC;

-- 4.7 Get full reservation detail for a specific reservation
SELECT r.reservation_id, r.start_time, r.end_time, r.hourly_rate_at_booking, r.total_cost, r.created_at,
       rs.status_name,
       s.spot_id, a.street, a.city, a.state, a.zip_code, st.type_name,
       u.first_name AS renter_first, u.last_name AS renter_last, u.email,
       v.make, v.model, v.year, v.color, vr.license_plate, vr.plate_state,
       p.payment_id, p.amount, p.paid_at, p.method, p.payment_status
FROM reservations r
JOIN reservation_statuses rs ON r.status_id        = rs.status_id
JOIN spots s                 ON r.spot_id            = s.spot_id
JOIN addresses a             ON s.address_id         = a.address_id
JOIN spot_types st           ON s.spot_type_id       = st.spot_type_id
JOIN users u                 ON r.renter_user_id     = u.user_id
JOIN vehicles v              ON r.vehicle_id         = v.vehicle_id
LEFT JOIN vehicle_registrations vr ON v.vehicle_id  = vr.vehicle_id
LEFT JOIN payments p                ON r.reservation_id = p.reservation_id
WHERE r.reservation_id = 1;

-- 4.8 Get review for a specific reservation
SELECT rv.reservation_id, rv.rating, rv.comment, rv.created_at,
       u.first_name, u.last_name
FROM reviews rv
JOIN reservations r ON rv.reservation_id = r.reservation_id
JOIN users u        ON r.renter_user_id  = u.user_id
WHERE rv.reservation_id = 1;

-- 4.9 Get all reviews for a host (to display their average rating)
SELECT rv.reservation_id, rv.rating, rv.comment, rv.created_at,
       u.first_name AS renter_first, u.last_name AS renter_last,
       s.spot_id, a.street
FROM reviews rv
JOIN reservations r ON rv.reservation_id = r.reservation_id
JOIN spots s        ON r.spot_id          = s.spot_id
JOIN addresses a    ON s.address_id       = a.address_id
JOIN users u        ON r.renter_user_id   = u.user_id
WHERE s.host_user_id = 1
ORDER BY rv.created_at DESC;

-- 4.10 Get average rating for a host (derived user_rating attribute)
SELECT u.user_id, u.first_name, u.last_name,
       ROUND(AVG(rv.rating), 2) AS avg_rating,
       COUNT(rv.reservation_id) AS total_reviews
FROM users u
JOIN spots s        ON s.host_user_id     = u.user_id
JOIN reservations r ON r.spot_id          = s.spot_id
JOIN reviews rv     ON rv.reservation_id  = r.reservation_id
WHERE u.user_id = 1
GROUP BY u.user_id, u.first_name, u.last_name;

-- 4.11 Get all vehicles for a user
SELECT v.vehicle_id, v.make, v.model, v.year, v.color,
       vr.license_plate, vr.plate_state, vr.expires_on, vr.is_verified
FROM vehicles v
LEFT JOIN vehicle_registrations vr ON v.vehicle_id = vr.vehicle_id
WHERE v.user_id = 6;

-- 4.12 Get all phone numbers for a user
SELECT phone_number
FROM user_phones
WHERE user_id = 1;

-- 4.13 Get user profile by computing_id (login lookup)
SELECT user_id, computing_id, first_name, last_name, email, created_at
FROM users
WHERE computing_id = 'abc1de';

-- 4.14 Check for double-booking conflict before inserting a reservation
SELECT COUNT(*) AS conflict_count
FROM reservations r
JOIN reservation_statuses rs ON r.status_id = rs.status_id
WHERE r.spot_id = 1
  AND rs.status_name IN ('Pending', 'Confirmed')
  AND r.start_time < '2025-10-01 14:00:00'
  AND r.end_time   > '2025-10-01 09:00:00';

-- 4.15 Get all spots listed by a host (host's listings)
SELECT s.spot_id, s.hourly_rate, s.is_active, s.instructions,
       a.street, a.city, st.type_name
FROM spots s
JOIN addresses a   ON s.address_id   = a.address_id
JOIN spot_types st ON s.spot_type_id = st.spot_type_id
WHERE s.host_user_id = 1
ORDER BY s.is_active DESC, s.spot_id ASC;

-- 4.16 Get availability windows for a spot
SELECT window_id, start_time, end_time, availability_kind
FROM availability_windows
WHERE spot_id = 1
ORDER BY start_time ASC;

-- 4.17 Get all reservations for a specific spot (host view)
SELECT r.reservation_id, r.renter_user_id, r.start_time, r.end_time, rs.status_name
FROM reservations r
JOIN reservation_statuses rs ON r.status_id = rs.status_id
WHERE r.spot_id = 1
ORDER BY r.start_time DESC;

-- 4.18 Get payment details for a reservation
SELECT p.payment_id, p.amount, p.paid_at, p.method, p.payment_status
FROM payments p
WHERE p.reservation_id = 1;

-- 4.19 Get all spot types (for filter/search dropdowns)
SELECT spot_type_id, type_name FROM spot_types ORDER BY type_name;

-- 4.20 Get spots filtered by type and max price
SELECT s.spot_id, s.hourly_rate, s.instructions,
       a.street, a.city, st.type_name
FROM spots s
JOIN addresses a   ON s.address_id   = a.address_id
JOIN spot_types st ON s.spot_type_id = st.spot_type_id
WHERE s.is_active = TRUE
  AND st.type_name = 'Driveway'
  AND s.hourly_rate <= 6.00
ORDER BY s.hourly_rate ASC;

-- =============================================================
-- SECTION 5: NON-ADVANCED SQL COMMANDS — UPDATE
-- =============================================================

-- 5.1 Update spot details (host edits their listing)
UPDATE spots
SET hourly_rate  = 5.50,
    instructions = 'Updated: Pull into driveway on left. Gate code is 7890.',
    is_active    = TRUE
WHERE spot_id = 1 AND host_user_id = 1;

-- 5.2 Change reservation status to 'Confirmed' (host accepts)
UPDATE reservations
SET status_id = (SELECT status_id FROM reservation_statuses WHERE status_name = 'Confirmed')
WHERE reservation_id = 7;

-- 5.3 Change reservation status to 'Completed' (host marks complete)
UPDATE reservations
SET status_id = (SELECT status_id FROM reservation_statuses WHERE status_name = 'Completed')
WHERE reservation_id = 7;

-- 5.4 Cancel a reservation (renter or host cancels)
UPDATE reservations
SET status_id = (SELECT status_id FROM reservation_statuses WHERE status_name = 'Cancelled')
WHERE reservation_id = 9;

-- 5.5 Mark a payment as paid
UPDATE payments
SET paid_at        = NOW(),
    payment_status = 'Paid'
WHERE reservation_id = 4;

-- 5.6 Update user profile information
UPDATE users
SET first_name = 'Alicia',
    email      = 'alicia.chen@virginia.edu'
WHERE user_id = 1;

-- 5.7 Mark a vehicle registration as verified
UPDATE vehicle_registrations
SET is_verified = TRUE,
    verified_at = NOW()
WHERE vehicle_id = 3;

-- 5.8 Deactivate a spot (host takes it offline)
UPDATE spots
SET is_active = FALSE
WHERE spot_id = 6 AND host_user_id = 3;

-- 5.9 Update an availability window (host adjusts their schedule)
UPDATE availability_windows
SET end_time = '2025-10-01 20:00:00'
WHERE window_id = 1 AND spot_id = 1;

-- 5.10 Update a review (renter edits their rating/comment)
UPDATE reviews
SET rating  = 5,
    comment = 'Spot was perfect — easy to find and exactly as described!'
WHERE reservation_id = 1;

-- =============================================================
-- SECTION 6: NON-ADVANCED SQL COMMANDS — DELETE
-- =============================================================

-- 6.1 Delete a spot photo (host removes an uploaded image)
DELETE FROM spot_photos
WHERE photo_id = 12 AND spot_id = 15;

-- 6.2 Delete an availability window (host removes a time slot)
DELETE FROM availability_windows
WHERE window_id = 3 AND spot_id = 1;

-- 6.3 Remove a phone number from a user's profile
DELETE FROM user_phones
WHERE user_id = 2 AND phone_number = '434-555-0199';

-- 6.4 Delete a vehicle registration record
DELETE FROM vehicle_registrations
WHERE vehicle_id = 3;

-- 6.5 Safely delete a vehicle only if it has no reservations (derived table pattern)
DELETE FROM vehicles
WHERE vehicle_id = 3
  AND vehicle_id NOT IN (
      SELECT vehicle_id FROM (SELECT vehicle_id FROM reservations) AS reserved
  );

-- 6.6 Delete a review (renter removes their own review)
DELETE FROM reviews
WHERE reservation_id = 5;

-- 6.7 Delete a cancelled reservation and its payment record
DELETE FROM payments
WHERE reservation_id IN (
    SELECT reservation_id FROM reservations
    WHERE status_id = (SELECT status_id FROM reservation_statuses WHERE status_name = 'Cancelled')
      AND reservation_id = 9
);
DELETE FROM reservations
WHERE reservation_id = 9
  AND status_id = (SELECT status_id FROM reservation_statuses WHERE status_name = 'Cancelled');

-- =============================================================
-- SECTION 7: ADVANCED SQL COMMANDS
-- =============================================================

-- ---------------------------------------------------------------
-- ADVANCED SQL #1: TRIGGER
-- Purpose: Prevent double-booking. Before inserting a new
-- reservation with status 'Pending' or 'Confirmed', this trigger
-- checks whether the same spot already has a confirmed or pending
-- reservation that overlaps the requested time window. If a
-- conflict is found, it raises an error and aborts the insert.
-- ---------------------------------------------------------------

DELIMITER //

CREATE TRIGGER prevent_double_booking
BEFORE INSERT ON reservations
FOR EACH ROW
BEGIN
    DECLARE conflict_count INT;
    DECLARE new_status_name VARCHAR(32);

    -- Only check active (non-cancelled) bookings
    SELECT status_name INTO new_status_name
    FROM reservation_statuses
    WHERE status_id = NEW.status_id;

    IF new_status_name IN ('Pending', 'Confirmed') THEN
        SELECT COUNT(*) INTO conflict_count
        FROM reservations r
        JOIN reservation_statuses rs ON r.status_id = rs.status_id
        WHERE r.spot_id      = NEW.spot_id
          AND rs.status_name IN ('Pending', 'Confirmed')
          AND r.start_time   < NEW.end_time
          AND r.end_time     > NEW.start_time;

        IF conflict_count > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking conflict: this spot is already reserved for the requested time window.';
        END IF;
    END IF;
END //

DELIMITER ;

-- ---------------------------------------------------------------
-- ADVANCED SQL #2: STORED PROCEDURE
-- Purpose: Create a complete booking in one atomic operation.
-- The procedure:
--   1. Looks up the current hourly rate for the spot
--   2. Calculates total cost based on duration
--   3. Checks for double-booking conflicts
--   4. Inserts the reservation with status 'Pending'
--   5. Creates a corresponding payment record with status 'Pending'
--   6. Returns the new reservation_id via an OUT parameter
-- ---------------------------------------------------------------

DELIMITER //

CREATE PROCEDURE create_booking(
    IN  p_spot_id        INT,
    IN  p_renter_user_id INT,
    IN  p_vehicle_id     INT,
    IN  p_start_time     DATETIME,
    IN  p_end_time       DATETIME,
    IN  p_payment_method VARCHAR(32),
    OUT p_reservation_id INT
)
BEGIN
    DECLARE v_hourly_rate   DECIMAL(8,2);
    DECLARE v_total_cost    DECIMAL(10,2);
    DECLARE v_pending_id    INT;
    DECLARE v_conflict_cnt  INT;
    DECLARE v_hours         DECIMAL(10,4);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Step 1: Get the spot's hourly rate
    SELECT hourly_rate INTO v_hourly_rate
    FROM spots
    WHERE spot_id = p_spot_id AND is_active = TRUE;

    IF v_hourly_rate IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Spot not found or is not active.';
    END IF;

    -- Step 2: Calculate cost (in fractional hours)
    SET v_hours      = TIMESTAMPDIFF(MINUTE, p_start_time, p_end_time) / 60.0;
    SET v_total_cost = ROUND(v_hourly_rate * v_hours, 2);

    -- Step 3: Check for conflicts
    SELECT COUNT(*) INTO v_conflict_cnt
    FROM reservations r
    JOIN reservation_statuses rs ON r.status_id = rs.status_id
    WHERE r.spot_id      = p_spot_id
      AND rs.status_name IN ('Pending', 'Confirmed')
      AND r.start_time   < p_end_time
      AND r.end_time     > p_start_time;

    IF v_conflict_cnt > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Booking conflict: the spot is unavailable for the requested time.';
    END IF;

    -- Step 4: Get 'Pending' status id
    SELECT status_id INTO v_pending_id
    FROM reservation_statuses
    WHERE status_name = 'Pending';

    -- Step 5: Insert reservation
    INSERT INTO reservations
        (spot_id, renter_user_id, vehicle_id, status_id,
         start_time, end_time, hourly_rate_at_booking, total_cost, created_at)
    VALUES
        (p_spot_id, p_renter_user_id, p_vehicle_id, v_pending_id,
         p_start_time, p_end_time, v_hourly_rate, v_total_cost, NOW());

    SET p_reservation_id = LAST_INSERT_ID();

    -- Step 6: Create payment record
    INSERT INTO payments (reservation_id, amount, paid_at, method, payment_status)
    VALUES (p_reservation_id, v_total_cost, NULL, p_payment_method, 'Pending');

    COMMIT;
END //

DELIMITER ;

-- Example call:
-- CALL create_booking(2, 6, 6, '2025-11-01 09:00:00', '2025-11-01 12:00:00', 'Credit Card', @new_id);
-- SELECT @new_id;

-- ---------------------------------------------------------------
-- ADVANCED SQL #3: CHECK CONSTRAINT
-- Purpose: Enforce domain integrity on rating, hourly_rate,
-- payment_status, and availability_kind. CHECK constraints ensure
-- invalid values are rejected at the database level regardless of
-- application-layer validation.
-- ---------------------------------------------------------------

-- 3a. Rating must be between 1 and 5 (inclusive)
ALTER TABLE reviews
ADD CONSTRAINT chk_rating_range
CHECK (rating BETWEEN 1 AND 5);

-- 3b. Hourly rate must be a positive value
ALTER TABLE spots
ADD CONSTRAINT chk_hourly_rate_positive
CHECK (hourly_rate > 0);

-- 3c. Payment status must be one of the allowed values
ALTER TABLE payments
ADD CONSTRAINT chk_payment_status_values
CHECK (payment_status IN ('Pending', 'Paid', 'Refunded', 'Failed'));

-- 3d. Availability kind must be either 'Available' or 'Blocked'
ALTER TABLE availability_windows
ADD CONSTRAINT chk_availability_kind_values
CHECK (availability_kind IN ('Available', 'Blocked'));

-- 3e. Reservation end_time must be strictly after start_time
ALTER TABLE reservations
ADD CONSTRAINT chk_reservation_time_order
CHECK (end_time > start_time);

-- =============================================================
-- END OF FILE
-- =============================================================
