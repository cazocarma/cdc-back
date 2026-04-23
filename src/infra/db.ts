import mssql from 'mssql';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let pool: mssql.ConnectionPool | null = null;
let connecting: Promise<mssql.ConnectionPool> | null = null;

const config: mssql.config = {
  server: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  options: {
    encrypt: env.DB_ENCRYPT,
    trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
    enableArithAbort: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
  connectionTimeout: 15_000,
  requestTimeout: 30_000,
};

export async function getPool(): Promise<mssql.ConnectionPool> {
  if (pool?.connected) return pool;
  if (connecting) return connecting;

  connecting = new mssql.ConnectionPool(config)
    .connect()
    .then((p) => {
      pool = p;
      p.on('error', (err) => logger.error({ err }, 'mssql pool error'));
      logger.info({ host: env.DB_HOST, db: env.DB_NAME }, 'mssql pool listo');
      return p;
    })
    .finally(() => {
      connecting = null;
    });

  return connecting;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

export { mssql };
