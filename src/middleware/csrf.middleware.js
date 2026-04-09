// ── CSRF middleware ────────────────────────────────────────────────
// Bloquea metodos state-changing si el header X-CSRF-Token no coincide
// con el csrfToken guardado en la sesion server-side.

const { HEADER, SAFE_METHODS, constantTimeEquals } = require("../lib/csrf");
const { audit } = require("../lib/audit");

function csrfMiddleware(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const expected = req.session?.csrfToken;
  const received = req.get(HEADER);

  if (!expected || !received || !constantTimeEquals(expected, received)) {
    audit({
      usuarioId: req.session?.userId ?? null,
      operacion: "CSRF_FAIL",
      detalle: `${req.method} ${req.originalUrl}`,
    });
    return res.status(403).json({ message: "CSRF token invalido" });
  }

  next();
}

module.exports = { csrfMiddleware };
