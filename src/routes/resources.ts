import { Router } from "express";
import type { Transaction } from "mssql";
import { z } from "zod";
import { getAuthUser, getUnauthorizedHeaders } from "../lib/auth.js";
import { writeAuditEntry } from "../lib/audit.js";
import { getPool } from "../lib/db.js";
import { ok, error, parsePositiveInt } from "../lib/http.js";
import { buildMutationEntries } from "../lib/resource-mutations.js";
import {
  getResourceConfig,
  getSelectableColumns,
  sanitizeRecord,
} from "../lib/resources.js";
import { mapSqlError } from "../lib/sql-errors.js";

import type { Request, Response } from "express";

const router = Router();

const listSchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  q: z.string().optional(),
});

function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function queryString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return undefined;
}

function buildWhereClause(
  q: string | undefined,
  searchColumns: string[] | undefined
): { whereSql: string; searchValue: string | null } {
  const normalizedQ = q?.trim();
  if (!normalizedQ || !searchColumns || searchColumns.length === 0) {
    return { whereSql: "", searchValue: null };
  }

  const predicates = searchColumns.map((column) => `${column} LIKE @q`).join(" OR ");
  return {
    whereSql: ` WHERE (${predicates})`,
    searchValue: `%${normalizedQ}%`,
  };
}

function parseId(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.floor(parsed);
}

// GET /api/v1/:resource — List with pagination
router.get("/api/v1/:resource", async (req: Request, res: Response) => {
  try {
    const resource = paramString(req.params.resource);
    const config = getResourceConfig(resource);
    if (!config) {
      return error(res, "Recurso no soportado.", 404);
    }

    if (!(await getAuthUser(req))) {
      return error(
        res,
        "Token invalido o expirado.",
        401,
        undefined,
        getUnauthorizedHeaders()
      );
    }

    const parsed = listSchema.parse({
      page: queryString(req.query.page),
      pageSize: queryString(req.query.pageSize),
      q: queryString(req.query.q),
    });

    const page = parsePositiveInt(parsed.page ?? null, 1);
    const pageSize = Math.min(parsePositiveInt(parsed.pageSize ?? null, 20), 200);
    const offset = (page - 1) * pageSize;
    const { whereSql, searchValue } = buildWhereClause(parsed.q, config.searchColumns);

    const pool = await getPool();
    const countReq = pool.request();
    const listReq = pool.request();
    listReq.input("offset", offset);
    listReq.input("pageSize", pageSize);

    if (searchValue) {
      countReq.input("q", searchValue);
      listReq.input("q", searchValue);
    }

    const selectClause = getSelectableColumns(config).join(", ");
    const countQuery = `SELECT COUNT(1) AS total FROM ${config.table}${whereSql};`;
    const listQuery = `
      SELECT ${selectClause}
      FROM ${config.table}${whereSql}
      ORDER BY ${config.idColumn} DESC
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY;
    `;

    const [countResult, listResult] = await Promise.all([
      countReq.query(countQuery),
      listReq.query(listQuery),
    ]);

    ok(res, {
      page,
      pageSize,
      total: countResult.recordset[0]?.total ?? 0,
      data: listResult.recordset.map((row: Record<string, unknown>) => sanitizeRecord(config, row)),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return error(res, "Querystring invalida.", 422, e.flatten());
    }
    error(res, "Error consultando recurso.", 500, e instanceof Error ? e.message : e);
  }
});

// POST /api/v1/:resource — Create
router.post("/api/v1/:resource", async (req: Request, res: Response) => {
  const resource = paramString(req.params.resource);
  const config = getResourceConfig(resource);

  if (!config) {
    return error(res, "Recurso no soportado.", 404);
  }
  if (config.readOnly) {
    return error(res, "Recurso de solo lectura.", 405);
  }

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return error(
      res,
      "Token invalido o expirado.",
      401,
      undefined,
      getUnauthorizedHeaders()
    );
  }

  let tx: Transaction | null = null;

  try {
    const body = req.body;
    const builtEntries = buildMutationEntries(body, resource, "insert");

    if (builtEntries.message) {
      return error(res, builtEntries.message, 422, builtEntries.details);
    }

    if (builtEntries.entries.length === 0) {
      return error(res, "No hay columnas insertables en el payload.", 422);
    }

    const pool = await getPool();
    tx = pool.transaction();
    await tx.begin();

    const sqlReq = tx.request();

    const columns = builtEntries.entries.map((entry) => entry.dbColumn).join(", ");
    const paramsSql = builtEntries.entries
      .map((entry, index) => {
        const paramName = `p${index}`;
        sqlReq.input(paramName, entry.value);
        return `@${paramName}`;
      })
      .join(", ");

    const query = `
      INSERT INTO ${config.table} (${columns})
      OUTPUT INSERTED.*
      VALUES (${paramsSql});
    `;

    const result = await sqlReq.query(query);
    const created = result.recordset[0] as Record<string, unknown> | undefined;
    if (!created) {
      throw new Error("No fue posible obtener el registro insertado.");
    }

    const insertedId = created[config.idColumn];

    await writeAuditEntry({
      tx,
      idUsuario: authUser.idUsuario,
      operacion: "INSERT",
      tabla: config.table,
      pk: String(insertedId ?? ""),
      detalle: `resource=${resource}`,
      beforeJson: null,
      afterJson: created,
      sensitiveColumns: config.sensitiveColumns,
      origen: "API",
    });

    await tx.commit();

    ok(
      res,
      {
        id: insertedId,
        data: sanitizeRecord(config, created),
      },
      201
    );
  } catch (e) {
    if (tx) {
      try {
        await tx.rollback();
      } catch {
        // ignore rollback failures
      }
    }

    const sqlError = mapSqlError(e);
    if (sqlError) {
      return error(res, sqlError.message, sqlError.status);
    }

    error(res, "Error insertando registro.", 500, e instanceof Error ? e.message : e);
  }
});

// GET /api/v1/:resource/:id — Get single record
router.get("/api/v1/:resource/:id", async (req: Request, res: Response) => {
  try {
    const resource = paramString(req.params.resource);
    const id = paramString(req.params.id);
    const config = getResourceConfig(resource);
    if (!config) {
      return error(res, "Recurso no soportado.", 404);
    }

    if (!(await getAuthUser(req))) {
      return error(
        res,
        "Token invalido o expirado.",
        401,
        undefined,
        getUnauthorizedHeaders()
      );
    }

    const parsedId = parseId(id);
    if (!parsedId) {
      return error(res, "Id invalido.", 422);
    }

    const selectClause = getSelectableColumns(config).join(", ");
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", parsedId)
      .query(`SELECT ${selectClause} FROM ${config.table} WHERE ${config.idColumn} = @id`);

    if (result.recordset.length === 0) {
      return error(res, "Registro no encontrado.", 404);
    }

    ok(res, sanitizeRecord(config, result.recordset[0]));
  } catch (e) {
    error(res, "Error consultando registro.", 500, e instanceof Error ? e.message : e);
  }
});

// PUT /api/v1/:resource/:id — Update
router.put("/api/v1/:resource/:id", async (req: Request, res: Response) => {
  const resource = paramString(req.params.resource);
  const id = paramString(req.params.id);
  const config = getResourceConfig(resource);
  if (!config) {
    return error(res, "Recurso no soportado.", 404);
  }
  if (config.readOnly) {
    return error(res, "Recurso de solo lectura.", 405);
  }

  const parsedId = parseId(id);
  if (!parsedId) {
    return error(res, "Id invalido.", 422);
  }

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return error(
      res,
      "Token invalido o expirado.",
      401,
      undefined,
      getUnauthorizedHeaders()
    );
  }

  let tx: Transaction | null = null;

  try {
    const body = req.body;
    const builtEntries = buildMutationEntries(body, resource, "update");

    if (builtEntries.message) {
      return error(res, builtEntries.message, 422, builtEntries.details);
    }

    if (builtEntries.entries.length === 0) {
      return error(res, "No hay columnas actualizables en el payload.", 422);
    }

    const pool = await getPool();
    tx = pool.transaction();
    await tx.begin();

    const beforeReq = tx.request();
    beforeReq.input("id", parsedId);
    const beforeResult = await beforeReq.query(
      `SELECT * FROM ${config.table} WHERE ${config.idColumn} = @id`
    );
    const beforeRow = beforeResult.recordset[0] as Record<string, unknown> | undefined;

    if (!beforeRow) {
      await tx.rollback();
      return error(res, "Registro no encontrado.", 404);
    }

    const updateReq = tx.request();
    updateReq.input("id", parsedId);

    const setClause = builtEntries.entries
      .map((entry, index) => {
        const paramName = `p${index}`;
        updateReq.input(paramName, entry.value);
        return `${entry.dbColumn} = @${paramName}`;
      })
      .join(", ");

    const updateQuery = `
      UPDATE ${config.table}
      SET ${setClause}
      OUTPUT INSERTED.*
      WHERE ${config.idColumn} = @id;
    `;

    const updateResult = await updateReq.query(updateQuery);
    const updatedRow = updateResult.recordset[0] as Record<string, unknown> | undefined;
    if (!updatedRow) {
      await tx.rollback();
      return error(res, "Registro no encontrado.", 404);
    }

    await writeAuditEntry({
      tx,
      idUsuario: authUser.idUsuario,
      operacion: "UPDATE",
      tabla: config.table,
      pk: String(parsedId),
      detalle: `resource=${resource}`,
      beforeJson: beforeRow,
      afterJson: updatedRow,
      sensitiveColumns: config.sensitiveColumns,
      origen: "API",
    });

    await tx.commit();

    ok(res, {
      affected: 1,
      data: sanitizeRecord(config, updatedRow),
    });
  } catch (e) {
    if (tx) {
      try {
        await tx.rollback();
      } catch {
        // ignore rollback failures
      }
    }

    const sqlError = mapSqlError(e);
    if (sqlError) {
      return error(res, sqlError.message, sqlError.status);
    }

    error(res, "Error actualizando registro.", 500, e instanceof Error ? e.message : e);
  }
});

// DELETE /api/v1/:resource/:id — Delete
router.delete("/api/v1/:resource/:id", async (req: Request, res: Response) => {
  const resource = paramString(req.params.resource);
  const id = paramString(req.params.id);
  const config = getResourceConfig(resource);
  if (!config) {
    return error(res, "Recurso no soportado.", 404);
  }
  if (config.readOnly) {
    return error(res, "Recurso de solo lectura.", 405);
  }

  const parsedId = parseId(id);
  if (!parsedId) {
    return error(res, "Id invalido.", 422);
  }

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return error(
      res,
      "Token invalido o expirado.",
      401,
      undefined,
      getUnauthorizedHeaders()
    );
  }

  let tx: Transaction | null = null;

  try {
    const pool = await getPool();
    tx = pool.transaction();
    await tx.begin();

    const deleteReq = tx.request();
    deleteReq.input("id", parsedId);

    const deleteResult = await deleteReq.query(`
      DELETE FROM ${config.table}
      OUTPUT DELETED.*
      WHERE ${config.idColumn} = @id;
    `);

    const deletedRow = deleteResult.recordset[0] as Record<string, unknown> | undefined;
    if (!deletedRow) {
      await tx.rollback();
      return error(res, "Registro no encontrado.", 404);
    }

    await writeAuditEntry({
      tx,
      idUsuario: authUser.idUsuario,
      operacion: "DELETE",
      tabla: config.table,
      pk: String(parsedId),
      detalle: `resource=${resource}`,
      beforeJson: deletedRow,
      afterJson: null,
      sensitiveColumns: config.sensitiveColumns,
      origen: "API",
    });

    await tx.commit();

    ok(res, {
      affected: 1,
      data: sanitizeRecord(config, deletedRow),
    });
  } catch (e) {
    if (tx) {
      try {
        await tx.rollback();
      } catch {
        // ignore rollback failures
      }
    }

    const sqlError = mapSqlError(e);
    if (sqlError) {
      return error(res, sqlError.message, sqlError.status);
    }

    error(res, "Error eliminando registro.", 500, e instanceof Error ? e.message : e);
  }
});

export default router;
