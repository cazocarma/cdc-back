import { NextRequest } from "next/server";
import type { Transaction } from "mssql";
import { getAuthUser } from "@/lib/auth";
import { writeAuditEntry } from "@/lib/audit";
import { getPool } from "@/lib/db";
import { error, ok } from "@/lib/http";
import { buildMutationEntries } from "@/lib/resource-mutations";
import {
  getResourceConfig,
  getSelectableColumns,
  sanitizeRecord,
} from "@/lib/resources";
import { mapSqlError } from "@/lib/sql-errors";

function parseId(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.floor(parsed);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const { resource, id } = await params;
    const config = getResourceConfig(resource);
    if (!config) {
      return error("Recurso no soportado.", 404);
    }

    const parsedId = parseId(id);
    if (!parsedId) {
      return error("Id invalido.", 422);
    }

    const selectClause = getSelectableColumns(config).join(", ");
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", parsedId)
      .query(`SELECT ${selectClause} FROM ${config.table} WHERE ${config.idColumn} = @id`);

    if (result.recordset.length === 0) {
      return error("Registro no encontrado.", 404);
    }

    return ok(sanitizeRecord(config, result.recordset[0]));
  } catch (e) {
    return error("Error consultando registro.", 500, e instanceof Error ? e.message : e);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const { resource, id } = await params;
  const config = getResourceConfig(resource);
  if (!config) {
    return error("Recurso no soportado.", 404);
  }
  if (config.readOnly) {
    return error("Recurso de solo lectura.", 405);
  }

  const parsedId = parseId(id);
  if (!parsedId) {
    return error("Id invalido.", 422);
  }

  const authUser = await getAuthUser(request);
  if (!authUser) {
    return error("Unauthorized.", 401);
  }

  let tx: Transaction | null = null;

  try {
    const body = await request.json();
    const builtEntries = buildMutationEntries(body, resource, "update");

    if (builtEntries.message) {
      return error(builtEntries.message, 422, builtEntries.details);
    }

    if (builtEntries.entries.length === 0) {
      return error("No hay columnas actualizables en el payload.", 422);
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
      return error("Registro no encontrado.", 404);
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
      return error("Registro no encontrado.", 404);
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

    return ok({
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
      return error(sqlError.message, sqlError.status);
    }

    return error("Error actualizando registro.", 500, e instanceof Error ? e.message : e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const { resource, id } = await params;
  const config = getResourceConfig(resource);
  if (!config) {
    return error("Recurso no soportado.", 404);
  }
  if (config.readOnly) {
    return error("Recurso de solo lectura.", 405);
  }

  const parsedId = parseId(id);
  if (!parsedId) {
    return error("Id invalido.", 422);
  }

  const authUser = await getAuthUser(request);
  if (!authUser) {
    return error("Unauthorized.", 401);
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
      return error("Registro no encontrado.", 404);
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

    return ok({
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
      return error(sqlError.message, sqlError.status);
    }

    return error("Error eliminando registro.", 500, e instanceof Error ? e.message : e);
  }
}
