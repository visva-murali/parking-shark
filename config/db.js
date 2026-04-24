// MySQL connection pool.
//
// Local dev: uses DB_HOST/DB_PORT from .env.
// GCP App Engine: if CLOUD_SQL_CONNECTION_NAME is set, we connect over the
// Cloud SQL unix socket at /cloudsql/<conn>.

const mysql = require('mysql2/promise');

const useSocket = !!process.env.CLOUD_SQL_CONNECTION_NAME;

const poolConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: false,
};

if (useSocket) {
  poolConfig.socketPath = `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`;
} else {
  poolConfig.host = process.env.DB_HOST || '127.0.0.1';
  poolConfig.port = parseInt(process.env.DB_PORT || '3306', 10);
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;
