const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

// ── Bootstrap env from shared infra .env ───────────────────────────
(function bootstrapEnv() {
  const envPath = resolve(__dirname, "../../../cdc-infra/.env");
  let raw;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
})();

// ── Helpers ────────────────────────────────────────────────────────
function toNumber(val, fallback) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(val, fallback) {
  if (val === undefined) return fallback;
  return String(val).toLowerCase() === "true";
}

function required(name) {
  const val = process.env[name];
  if (!val || !val.trim()) {
    console.error(`FATAL: required env var ${name} is missing.`);
    process.exit(1);
  }
  return val;
}

function requireSecret(name, minBytes) {
  const val = required(name);
  if (Buffer.byteLength(val) < minBytes) {
    console.error(`FATAL: ${name} must be at least ${minBytes} bytes.`);
    process.exit(1);
  }
  return val;
}

// ── Config ─────────────────────────────────────────────────────────
const config = {
  app: {
    env: process.env.NODE_ENV || "development",
    port: toNumber(process.env.PORT, 4000),
  },
  db: {
    host: required("DB_HOST"),
    port: toNumber(process.env.DB_PORT, 1433),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    database: required("DB_NAME"),
    encrypt: toBool(process.env.DB_ENCRYPT, true),
    trustServerCertificate: toBool(process.env.DB_TRUST_SERVER_CERTIFICATE, true),
  },
  oidc: {
    issuerUrl: required("OIDC_ISSUER_URL"),
    discoveryUrl: required("OIDC_DISCOVERY_URL"),
    clientId: required("OIDC_CLIENT_ID"),
    clientSecret: requireSecret("OIDC_CLIENT_SECRET", 32),
    redirectUri: required("OIDC_REDIRECT_URI"),
    postLogoutRedirectUri: required("OIDC_POST_LOGOUT_REDIRECT_URI"),
    scopes: process.env.OIDC_SCOPES || "openid profile email",
    requiredRole: required("OIDC_REQUIRED_ROLE"),
  },
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME || "cdc.sid",
    secret: requireSecret("SESSION_COOKIE_SECRET", 32),
    secure: toBool(process.env.SESSION_COOKIE_SECURE, false),
    sameSite: process.env.SESSION_COOKIE_SAMESITE || "strict",
    ttlSeconds: toNumber(process.env.SESSION_TTL_SECONDS, 28800),
  },
  redis: {
    host: process.env.REDIS_HOST || "redis",
    port: toNumber(process.env.REDIS_PORT, 6379),
    password: required("REDIS_PASSWORD"),
    db: toNumber(process.env.REDIS_DB, 3),
  },
};

module.exports = { config };
