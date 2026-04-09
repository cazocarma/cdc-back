// ── Audit logging helper ───────────────────────────────────────────
// Persiste eventos relevantes en cdc.Auditoria con Origen='OIDC'.
// Falla en silencio (solo loguea) para no romper el request principal.

const { getPool } = require("../db");
const { logger } = require("../logger");

const VALID_OPS = new Set([
  "LOGIN",
  "LOGOUT",
  "REFRESH_FAIL",
  "CSRF_FAIL",
  "UNAUTHORIZED",
  "FORBIDDEN_ROLE",
  "INSERT",
  "UPDATE",
  "DELETE",
]);

async function audit({ usuarioId = null, operacion, tabla = null, pk = null, detalle = null, origen = "OIDC" }) {
  if (!VALID_OPS.has(operacion)) {
    logger.warn({ operacion }, "audit.invalid-operation");
    return;
  }
  try {
    const pool = await getPool();
    await pool
      .request()
      .input("usuarioId", usuarioId)
      .input("operacion", operacion)
      .input("tabla", tabla)
      .input("pk", pk)
      .input("detalle", detalle)
      .input("origen", origen)
      .query(
        `INSERT INTO cdc.Auditoria (UsuarioId, Operacion, Tabla, Pk, Detalle, Origen)
         VALUES (@usuarioId, @operacion, @tabla, @pk, @detalle, @origen)`
      );
  } catch (err) {
    logger.error({ err, operacion }, "audit.persist-failed");
  }
}

module.exports = { audit };
