import { Router, type Request, type Response, type NextFunction } from 'express';
import type { ZodType } from 'zod';
import mssql from 'mssql';
import { getPool } from '../infra/db.js';
import { HttpError } from '../middleware/error.js';
import { translateSqlError } from './sql-errors.js';
import { PageQuerySchema, toPagedResponse, type MutationResponse } from './pagination.js';
import { logCrudEvent } from '../features/auth/auth.audit.js';

export interface ColumnInput {
  name: string;
  type: mssql.ISqlType | (() => mssql.ISqlType);
  value: unknown;
}

export interface CrudSpec<Dto extends { id: number | string }, Row> {
  /** Tabla completa con schema. Ej: 'cdc.Patogeno'. */
  table: string;
  /** Nombre de la columna PK en la tabla (default: 'Id'). */
  pkColumn?: string;
  /** Columnas de texto donde se aplica el filtro `q` (case-insensitive por collation DB). */
  searchColumns?: string[];
  /** ORDER BY del listado. Default: `<pkColumn> DESC`. */
  defaultOrderBy?: string;
  /** DB → API. */
  rowToDto: (row: Row) => Dto;
  /** Input validado → columnas SQL a insertar. */
  toCreateColumns: (input: unknown) => ColumnInput[];
  /** Input validado → columnas SQL a actualizar (solo las presentes). */
  toUpdateColumns: (input: unknown) => ColumnInput[];
  createSchema: ZodType;
  updateSchema: ZodType;
  /** Flags para recursos con verbos restringidos (usuarios sin POST, auditoria read-only). */
  allowCreate?: boolean;
  allowUpdate?: boolean;
  allowDelete?: boolean;
}

function parseIdParam(raw: string | undefined): number {
  if (!raw) {
    throw new HttpError(400, 'invalid_id', 'id invalido');
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, 'invalid_id', 'id invalido');
  }
  return n;
}

function bindInputs(request: mssql.Request, cols: ColumnInput[]): void {
  for (const c of cols) {
    request.input(c.name, c.type, c.value);
  }
}

function buildSearchClause(
  request: mssql.Request,
  columns: string[] | undefined,
  q: string | undefined
): string {
  if (!columns || columns.length === 0 || !q) return '';
  request.input('_q', mssql.NVarChar(202), `%${q}%`);
  const conditions = columns.map((c) => `[${c}] LIKE @_q`).join(' OR ');
  return `WHERE (${conditions})`;
}

async function list<Dto extends { id: number | string }, Row>(
  req: Request,
  res: Response,
  spec: CrudSpec<Dto, Row>
): Promise<void> {
  const { page, pageSize, q } = PageQuerySchema.parse(req.query);
  const offset = (page - 1) * pageSize;
  const pk = spec.pkColumn ?? 'Id';
  const orderBy = spec.defaultOrderBy ?? `[${pk}] DESC`;

  const pool = await getPool();
  const request = pool.request();
  request.input('_offset', mssql.Int, offset);
  request.input('_limit', mssql.Int, pageSize);
  const where = buildSearchClause(request, spec.searchColumns, q);

  const result = await request.query(
    `SELECT *, COUNT(*) OVER() AS _total
       FROM ${spec.table}
       ${where}
       ORDER BY ${orderBy}
       OFFSET @_offset ROWS FETCH NEXT @_limit ROWS ONLY;`
  );

  const rows = result.recordset as Array<Record<string, unknown>>;
  const firstRow = rows[0];
  const total = firstRow ? Number(firstRow['_total'] ?? 0) : 0;
  const data = rows.map((raw) => {
    const { _total: _ignored, ...rest } = raw;
    return spec.rowToDto(rest as Row);
  });

  res.json(toPagedResponse(page, pageSize, total, data));
}

async function getById<Dto extends { id: number | string }, Row>(
  req: Request,
  res: Response,
  spec: CrudSpec<Dto, Row>
): Promise<void> {
  const id = parseIdParam(req.params.id);
  const pk = spec.pkColumn ?? 'Id';
  const pool = await getPool();
  const result = await pool
    .request()
    .input('_id', mssql.BigInt, id)
    .query(`SELECT * FROM ${spec.table} WHERE [${pk}] = @_id;`);
  const row = result.recordset[0];
  if (!row) throw new HttpError(404, 'not_found', 'Recurso no encontrado');
  res.json(spec.rowToDto(row as Row));
}

async function create<Dto extends { id: number | string }, Row>(
  req: Request,
  res: Response,
  spec: CrudSpec<Dto, Row>
): Promise<void> {
  const pk = spec.pkColumn ?? 'Id';
  const input = spec.createSchema.parse(req.body);
  const cols = spec.toCreateColumns(input);
  if (cols.length === 0) {
    throw new HttpError(400, 'empty_body', 'Cuerpo sin columnas');
  }

  const pool = await getPool();
  const request = pool.request();
  bindInputs(request, cols);
  const columnList = cols.map((c) => `[${c.name}]`).join(', ');
  const paramList = cols.map((c) => `@${c.name}`).join(', ');

  let result: mssql.IResult<{ Id: number }>;
  try {
    result = await request.query<{ Id: number }>(
      `INSERT INTO ${spec.table} (${columnList})
         OUTPUT INSERTED.[${pk}] AS Id
         VALUES (${paramList});`
    );
  } catch (err) {
    translateSqlError(err);
  }

  const inserted = result!.recordset[0];
  if (!inserted) throw new HttpError(500, 'insert_failed', 'No se obtuvo Id insertado');
  const id = inserted.Id;

  await logCrudEvent(req, {
    operacion: 'INSERT',
    tabla: spec.table,
    pk: id,
    detalle: `cols: ${cols.map((c) => c.name).join(',')}`,
  });

  res.status(201).json({ id } satisfies MutationResponse);
}

async function update<Dto extends { id: number | string }, Row>(
  req: Request,
  res: Response,
  spec: CrudSpec<Dto, Row>
): Promise<void> {
  const pk = spec.pkColumn ?? 'Id';
  const id = parseIdParam(req.params.id);
  const input = spec.updateSchema.parse(req.body);
  const cols = spec.toUpdateColumns(input);
  if (cols.length === 0) {
    throw new HttpError(400, 'empty_body', 'Al menos un campo debe enviarse');
  }

  const pool = await getPool();
  const request = pool.request();
  bindInputs(request, cols);
  request.input('_id', mssql.BigInt, id);
  const setters = cols.map((c) => `[${c.name}] = @${c.name}`).join(', ');

  let result: mssql.IResult<unknown>;
  try {
    result = await request.query(
      `UPDATE ${spec.table} SET ${setters} WHERE [${pk}] = @_id;`
    );
  } catch (err) {
    translateSqlError(err);
  }

  const affected = result!.rowsAffected[0] ?? 0;
  if (affected === 0) throw new HttpError(404, 'not_found', 'Recurso no encontrado');

  await logCrudEvent(req, {
    operacion: 'UPDATE',
    tabla: spec.table,
    pk: id,
    detalle: `cols: ${cols.map((c) => c.name).join(',')}`,
  });

  res.json({ id, affected } satisfies MutationResponse);
}

async function remove<Dto extends { id: number | string }, Row>(
  req: Request,
  res: Response,
  spec: CrudSpec<Dto, Row>
): Promise<void> {
  const pk = spec.pkColumn ?? 'Id';
  const id = parseIdParam(req.params.id);

  const pool = await getPool();
  const request = pool.request();
  request.input('_id', mssql.BigInt, id);

  let result: mssql.IResult<unknown>;
  try {
    result = await request.query(`DELETE FROM ${spec.table} WHERE [${pk}] = @_id;`);
  } catch (err) {
    translateSqlError(err);
  }

  const affected = result!.rowsAffected[0] ?? 0;
  if (affected === 0) throw new HttpError(404, 'not_found', 'Recurso no encontrado');

  await logCrudEvent(req, {
    operacion: 'DELETE',
    tabla: spec.table,
    pk: id,
  });

  res.json({ id, affected } satisfies MutationResponse);
}

function methodNotAllowed(resource: string, verb: string): (req: Request, res: Response, next: NextFunction) => void {
  return (_req, _res, next) => {
    next(new HttpError(405, 'method_not_allowed', `${verb} no permitido en ${resource}`));
  };
}

/**
 * Construye un Router CRUD REST estandar a partir de una spec. Todas las features de negocio
 * comparten este esqueleto; la spec aporta tabla, mappers y schemas zod.
 * Los verbos bloqueados (allowCreate/Update/Delete = false) responden 405 — no retornan 404
 * porque el recurso existe, es el metodo el que no aplica.
 */
export function buildCrudRouter<Dto extends { id: number | string }, Row>(
  spec: CrudSpec<Dto, Row>
): Router {
  const router = Router();
  const allowCreate = spec.allowCreate ?? true;
  const allowUpdate = spec.allowUpdate ?? true;
  const allowDelete = spec.allowDelete ?? true;

  router.get('/', (req, res, next) => {
    list(req, res, spec).catch(next);
  });

  router.get('/:id', (req, res, next) => {
    getById(req, res, spec).catch(next);
  });

  if (allowCreate) {
    router.post('/', (req, res, next) => {
      create(req, res, spec).catch(next);
    });
  } else {
    router.post('/', methodNotAllowed(spec.table, 'POST'));
  }

  if (allowUpdate) {
    router.put('/:id', (req, res, next) => {
      update(req, res, spec).catch(next);
    });
  } else {
    router.put('/:id', methodNotAllowed(spec.table, 'PUT'));
  }

  if (allowDelete) {
    router.delete('/:id', (req, res, next) => {
      remove(req, res, spec).catch(next);
    });
  } else {
    router.delete('/:id', methodNotAllowed(spec.table, 'DELETE'));
  }

  return router;
}
