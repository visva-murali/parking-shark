// loads the trigger and procedure without needing the delimiter directive
// run with, node sql/load_routines.js

const mysql = require('mysql2/promise');

const TRIGGER = `
CREATE TRIGGER prevent_double_booking
BEFORE INSERT ON reservations
FOR EACH ROW
BEGIN
    DECLARE conflict_count INT;
    DECLARE new_status_name VARCHAR(32);

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
            SET MESSAGE_TEXT = 'Booking conflict, this spot is already reserved for the requested time window';
        END IF;
    END IF;
END
`;

const PROCEDURE = `
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

    SELECT hourly_rate INTO v_hourly_rate
    FROM spots
    WHERE spot_id = p_spot_id AND is_active = TRUE;

    IF v_hourly_rate IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Spot not found or is not active';
    END IF;

    SET v_hours      = TIMESTAMPDIFF(MINUTE, p_start_time, p_end_time) / 60.0;
    SET v_total_cost = ROUND(v_hourly_rate * v_hours, 2);

    SELECT COUNT(*) INTO v_conflict_cnt
    FROM reservations r
    JOIN reservation_statuses rs ON r.status_id = rs.status_id
    WHERE r.spot_id      = p_spot_id
      AND rs.status_name IN ('Pending', 'Confirmed')
      AND r.start_time   < p_end_time
      AND r.end_time     > p_start_time;

    IF v_conflict_cnt > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Booking conflict, the spot is unavailable for the requested time';
    END IF;

    SELECT status_id INTO v_pending_id
    FROM reservation_statuses
    WHERE status_name = 'Pending';

    INSERT INTO reservations
        (spot_id, renter_user_id, vehicle_id, status_id,
         start_time, end_time, hourly_rate_at_booking, total_cost, created_at)
    VALUES
        (p_spot_id, p_renter_user_id, p_vehicle_id, v_pending_id,
         p_start_time, p_end_time, v_hourly_rate, v_total_cost, NOW());

    SET p_reservation_id = LAST_INSERT_ID();

    INSERT INTO payments (reservation_id, amount, paid_at, method, payment_status)
    VALUES (p_reservation_id, v_total_cost, NULL, p_payment_method, 'Pending');

    COMMIT;
END
`;

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    database: 'parking_shark',
  });

  await conn.query('DROP TRIGGER IF EXISTS prevent_double_booking');
  await conn.query(TRIGGER);
  console.log('trigger created');

  await conn.query('DROP PROCEDURE IF EXISTS create_booking');
  await conn.query(PROCEDURE);
  console.log('procedure created');

  await conn.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
