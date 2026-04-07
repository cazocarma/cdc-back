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

function requireJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    console.error(
      "FATAL: JWT_SECRET must be at least 32 bytes.\n" +
        '  Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
    process.exit(1);
  }
  return secret;
}

// ── Config ─────────────────────────────────────────────────────────
const config = {
  app: {
    env: process.env.NODE_ENV || "development",
    port: toNumber(process.env.PORT, 4000),
    corsOrigin: process.env.CORS_ORIGIN || false,
  },
  authn: {
    jwtSecret: requireJwtSecret(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },
  db: {
    host: process.env.DB_HOST || "localhost",
    port: toNumber(process.env.DB_PORT, 1433),
    user: process.env.DB_USER || "sa",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "cdcdb",
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
  },
};

module.exports = { config };
