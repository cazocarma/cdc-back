// ── CSRF helpers ───────────────────────────────────────────────────
// Token aleatorio por sesion, regenerado en cada login. Se entrega
// al front via GET /auth/me y debe viajar como header X-CSRF-Token
// en cualquier metodo state-changing (POST/PUT/PATCH/DELETE).

const { randomBytes, timingSafeEqual } = require("node:crypto");

const HEADER = "X-CSRF-Token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function newCsrfToken() {
  return randomBytes(32).toString("hex");
}

function constantTimeEquals(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

module.exports = { HEADER, SAFE_METHODS, newCsrfToken, constantTimeEquals };
