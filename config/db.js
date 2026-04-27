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
  // app engine connects to cloud sql via unix socket
  poolConfig.socketPath = `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`;
} else {
  poolConfig.host = process.env.DB_HOST || '127.0.0.1';
  poolConfig.port = parseInt(process.env.DB_PORT || '3306', 10);
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;
