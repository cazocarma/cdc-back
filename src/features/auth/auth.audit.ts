import type { Request } from 'express';
import { getPool, mssql } from '../../infra/db.js';
import { logger } from '../../config/logger.js';

export type AuditOperacion =
  | 'LOGIN'
  | 'LOGOUT'
  | 'REFRESH_FAIL'
  | 'CSRF_FAIL'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN_ROLE'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE';

type AuthOperacion = Exclude<AuditOperacion, 'INSERT' | 'UPDATE' | 'DELETE'>;
type CrudOperacion = 'INSERT' | 'UPDATE' | 'DELETE';

export interface CrudAuditPayload {
  operacion: CrudOperacion;
  tabla: string;
  pk: string | number | bigint;
  detalle?: string;
}

async function insertAuditoria(params: {
  userId: number | null;
  operacion: AuditOperacion;
  origen: string;
  tabla: string | null;
  pk: string | null;
  detalle: string | null;
  requestId?: string;
}): Promise<void> {
  try {
    const pool = await getPool();
    await pool
      .request()
      .input('UsuarioId', mssql.BigInt, params.userId)
      .input('Operacion', mssql.VarChar(20), params.operacion)
      .input('Origen', mssql.VarChar(50), params.origen)
      .input('Tabla', mssql.VarChar(128), params.tabla)
      .input('Pk', mssql.VarChar(200), params.pk)
      .input('Detalle', mssql.NVarChar(500), params.detalle)
      .query(
        `INSERT INTO cdc.Auditoria (UsuarioId, Operacion, Origen, Tabla, Pk, Detalle)
         VALUES (@UsuarioId, @Operacion, @Origen, @Tabla, @Pk, @Detalle);`
      );
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, operacion: params.operacion, requestId: params.requestId },
      'auditoria no persistida'
    );
  }
}

/**
 * INSERT en cdc.Auditoria con Origen='OIDC' (AUTH_STANDARD §9).
 * Detalle prefijea con sub truncado a 8 chars — nunca el token completo.
 * Un fallo de auditoria no bloquea la request; solo se loguea como warn.
 */
export async function logAuditEvent(
  req: Request,
  operacion: AuthOperacion,
  detalle?: string
): Promise<void> {
  const userId = req.session?.userId ?? null;
  const sub = req.session?.sub ? `${req.session.sub.slice(0, 8)}…` : null;
  const piece = [sub, detalle].filter(Boolean).join(' ').slice(0, 500);
  const msg = piece.length > 0 ? piece : null;

  await insertAuditoria({
    userId,
    operacion,
    origen: 'OIDC',
    tabla: null,
    pk: null,
    detalle: msg,
    requestId: req.requestId,
  });
}

/**
 * Auditoria de mutaciones de negocio (CRUD). Origen='CDC', Tabla + Pk obligatorios.
 * Detalle debe listar solo nombres de columnas afectadas — nunca contenido (evita filtrar PII).
 * No bloquea la request: un fallo se loguea como warn.
 */
export async function logCrudEvent(req: Request, payload: CrudAuditPayload): Promise<void> {
  const userId = req.session?.userId ?? null;
  const detalle = payload.detalle ? payload.detalle.slice(0, 500) : null;
  const pkStr = String(payload.pk).slice(0, 200);

  await insertAuditoria({
    userId,
    operacion: payload.operacion,
    origen: 'CDC',
    tabla: payload.tabla.slice(0, 128),
    pk: pkStr,
    detalle,
    requestId: req.requestId,
  });
}
