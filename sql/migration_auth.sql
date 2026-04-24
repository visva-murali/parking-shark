-- =============================================================
-- Parking Shark - Auth Migration
-- Adds password_hash and role columns to users so the app can
-- perform login + role-based access control.
--
-- Run AFTER schema.sql and seed data, BEFORE grants.sql.
-- =============================================================

USE parking_shark;

ALTER TABLE users
    ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN role ENUM('user','admin') NOT NULL DEFAULT 'user';

-- Give the seed users a known bcrypt hash for the password "password123".
-- Hash generated via: bcrypt.hashSync('password123', 12)
-- Students can log in as e.g. ac@virginia.edu / password123 to demo.
UPDATE users
SET password_hash = '$2b$12$AIyalLYaZxsdhoCgC97Gjuw1FkIozWfWvI1uxqLRtoaCtWrx4VmnK'
WHERE password_hash = '';

-- Promote the first user to admin for demo convenience
UPDATE users SET role = 'admin' WHERE user_id = 1;
