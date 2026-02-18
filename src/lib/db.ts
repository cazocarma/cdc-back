import sql, { config as SqlConfig, ConnectionPool } from "mssql";

declare global {
  // eslint-disable-next-line no-var
  var cdcPool: ConnectionPool | undefined;
}

function getSqlConfig(): SqlConfig {
  return {
    user: process.env.DB_USER ?? "sa",
    password: process.env.DB_PASSWORD ?? "",
    server: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 1433),
    database: process.env.DB_NAME ?? "cdcdb",
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  };
}

export async function getPool(): Promise<ConnectionPool> {
  if (global.cdcPool?.connected) {
    return global.cdcPool;
  }

  const pool = new sql.ConnectionPool(getSqlConfig());
  global.cdcPool = await pool.connect();
  return global.cdcPool;
}

export function getSqlClient() {
  return sql;
}
