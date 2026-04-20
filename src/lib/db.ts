import sql, { config as SqlConfig, ConnectionPool } from "mssql";

declare global {
  // eslint-disable-next-line no-var
  var cdcPool: ConnectionPool | undefined;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function getSqlConfig(): SqlConfig {
  const isProduction = process.env.NODE_ENV === "production";
  const encrypt = parseBoolean(process.env.DB_ENCRYPT, isProduction);
  const trustServerCertificate = parseBoolean(
    process.env.DB_TRUST_SERVER_CERTIFICATE,
    !isProduction
  );

  return {
    user: process.env.DB_USER ?? "sa",
    password: process.env.DB_PASSWORD ?? "",
    server: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 1433),
    database: process.env.DB_NAME ?? "master",
    connectionTimeout: parsePositiveInt(process.env.DB_CONNECTION_TIMEOUT_MS, 15_000),
    requestTimeout: parsePositiveInt(process.env.DB_REQUEST_TIMEOUT_MS, 30_000),
    options: {
      encrypt,
      trustServerCertificate,
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
