// ── Authentication middleware ──────────────────────────────────────
// 1. Verifica que exista una sesion server-side autenticada (req.session.userId).
// 2. Refresca proactivamente el access_token si esta por expirar (< 30s).
// 3. Pone req.user con la info del usuario.
// 4. Aplica el guard de rol minimo (config.oidc.requiredRole).

const { config } = require("../config");
const { getClient } = require("../lib/oidc-client");
const { audit } = require("../lib/audit");
const { logger } = require("../logger");

const REFRESH_LEEWAY_MS = 30_000;

async function authnMiddleware(req, res, next) {
  const session = req.session;

  if (!session?.userId) {
    return res.status(401).json({ message: "No autenticado" });
  }

  if (session.role !== config.oidc.requiredRole) {
    audit({ usuarioId: session.userId, operacion: "FORBIDDEN_ROLE", detalle: `role=${session.role}` });
    return res.status(403).json({ message: "Sin acceso a CDC" });
  }

  const remaining = (session.accessTokenExpiresAt ?? 0) - Date.now();
  if (remaining < REFRESH_LEEWAY_MS) {
    try {
      const client = await getClient();
      const tokens = await client.refresh(session.refreshToken);

      session.accessToken = tokens.access_token;
      session.refreshToken = tokens.refresh_token || session.refreshToken;
      session.idToken = tokens.id_token || session.idToken;
      session.accessTokenExpiresAt = Date.now() + (tokens.expires_in ?? 300) * 1000;

      await new Promise((resolve, reject) =>
        session.save((err) => (err ? reject(err) : resolve()))
      );
      logger.debug({ userId: session.userId }, "oidc.refresh ok");
    } catch (err) {
      logger.warn({ err: err.message, userId: session.userId }, "oidc.refresh failed");
      audit({ usuarioId: session.userId, operacion: "REFRESH_FAIL", detalle: err.message });
      session.destroy(() => {
        res.clearCookie(config.session.cookieName, { path: "/" });
      });
      return res.status(401).json({ message: "Sesion expirada" });
    }
  }

  req.user = {
    id: session.userId,
    sub: session.sub,
    usuario: session.usuario,
    nombre: session.nombre,
    email: session.email,
    role: session.role,
  };
  next();
}

module.exports = { authnMiddleware };
