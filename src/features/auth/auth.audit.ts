import type { Request } from 'express';
import { getPool, mssql } from '../../infra/db.js';
import { logger } from '../../config/logger.js';

export type AuditOperacion =
  | 'LOGIN'
  | 'LOGOUT'
  | 'REFRESH_FAIL'
  | 'CSRF_FAIL'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN_ROLE';

/**
 * INSERT en cdc.Auditoria con Origen='OIDC' (AUTH_STANDARD §9).
 * Detalle prefijea con sub truncado a 8 chars — nunca el token completo.
 * Un fallo de auditoria no bloquea la request; solo se loguea como warn.
 */
export async function logAuditEvent(
  req: Request,
  operacion: AuditOperacion,
  detalle?: string
): Promise<void> {
  const userId = req.session?.userId ?? null;
  const sub = req.session?.sub ? `${req.session.sub.slice(0, 8)}…` : null;
  const piece = [sub, detalle].filter(Boolean).join(' ').slice(0, 500);
  const msg = piece.length > 0 ? piece : null;

  try {
    const pool = await getPool();
    await pool
      .request()
      .input('UsuarioId', mssql.BigInt, userId)
      .input('Operacion', mssql.VarChar(20), operacion)
      .input('Origen', mssql.VarChar(50), 'OIDC')
      .input('Detalle', mssql.NVarChar(500), msg)
      .query(
        `INSERT INTO cdc.Auditoria (UsuarioId, Operacion, Origen, Detalle)
         VALUES (@UsuarioId, @Operacion, @Origen, @Detalle);`
      );
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, operacion, requestId: req.requestId },
      'auditoria no persistida'
    );
  }
}
