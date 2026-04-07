const sql = require("mssql");
const { config } = require("./config");
const { logger } = require("./logger");

/** @type {sql.ConnectionPool | null} */
let pool = null;

function getSqlConfig() {
  return {
    user: config.db.user,
    password: config.db.password,
    server: config.db.host,
    port: config.db.port,
    database: config.db.database,
    options: {
      encrypt: config.db.encrypt,
      trustServerCertificate: config.db.trustServerCertificate,
      enableArithAbort: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  };
}

async function getPool() {
  if (pool?.connected) return pool;
  pool = await new sql.ConnectionPool(getSqlConfig()).connect();
  logger.info("database connected");
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
    logger.info("database pool closed");
  }
}

module.exports = { getPool, closePool, sql };
