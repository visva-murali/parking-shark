-- =============================================================
-- Parking Shark - Database-Level Security (GRANT / REVOKE)
-- CS 4750 Final Project
--
-- Two MySQL accounts enforce DB-level access control:
--   1. ps_app  - used by the Node.js web server to serve end users.
--                Only DML on application tables; no DDL; no privileges
--                beyond SELECT on the two lookup tables.
--   2. ps_dev  - used by developers for schema changes and debugging.
--                Full privileges on parking_shark.* only.
--
-- Run AFTER schema.sql, seed, and migration_auth.sql.
-- =============================================================

-- -------------------------------------------------------------
-- Application user (end-user-facing)
-- -------------------------------------------------------------
DROP USER IF EXISTS 'ps_app'@'%';
CREATE USER 'ps_app'@'%' IDENTIFIED BY 'psapppw123';

-- Regular DML on transactional tables
GRANT SELECT, INSERT, UPDATE, DELETE
    ON parking_shark.users                  TO 'ps_app'@'%';
GRANT SELECT, INSERT, DELETE
    ON parking_shark.user_phones            TO 'ps_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE
    ON parking_shark.vehicles               TO 'ps_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE
    ON parking_shark.vehicle_registrations  TO 'ps_app'@'%';
GRANT SELECT, INSERT, UPDATE
    ON parking_shark.addresses              TO 'ps_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE
    ON parking_shark.spots                  TO 'ps_app'@'%';
GRANT SELECT, INSERT, DELETE
    ON parking_shark.spot_photos            TO 'ps_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE
    ON parking_shark.availability_windows   TO 'ps_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE
    ON parking_shark.reservations           TO 'ps_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE
    ON parking_shark.payments               TO 'ps_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE
    ON parking_shark.reviews                TO 'ps_app'@'%';

-- Read-only on lookup tables (statuses and spot types are maintained by
-- developers, not end users).
GRANT SELECT
    ON parking_shark.spot_types             TO 'ps_app'@'%';
GRANT SELECT
    ON parking_shark.reservation_statuses   TO 'ps_app'@'%';

-- The app calls the create_booking stored procedure to atomically book a
-- spot. Grant EXECUTE so the app can invoke it.
GRANT EXECUTE ON PROCEDURE parking_shark.create_booking TO 'ps_app'@'%';

-- Session store table is auto-created by express-mysql-session.
-- Give the app account enough to manage it.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE
    ON parking_shark.sessions               TO 'ps_app'@'%';

-- Explicitly REVOKE destructive / schema-level privileges. Even if a GRANT
-- were accidentally added above, these REVOKEs keep the app user safe.
REVOKE DROP, ALTER, CREATE VIEW, CREATE ROUTINE, ALTER ROUTINE,
       TRIGGER, REFERENCES, GRANT OPTION
    ON parking_shark.* FROM 'ps_app'@'%';

-- -------------------------------------------------------------
-- Developer user (team members)
-- -------------------------------------------------------------
DROP USER IF EXISTS 'ps_dev'@'%';
CREATE USER 'ps_dev'@'%' IDENTIFIED BY 'psapppw123';
GRANT ALL PRIVILEGES ON parking_shark.* TO 'ps_dev'@'%';

FLUSH PRIVILEGES;

-- -------------------------------------------------------------
-- Verification queries (run manually to confirm):
-- SHOW GRANTS FOR 'ps_app'@'%';
-- SHOW GRANTS FOR 'ps_dev'@'%';
-- -------------------------------------------------------------
