import { NextRequest } from "next/server";
import { getPool, getSqlClient } from "@/lib/db";
import { error, ok } from "@/lib/http";
import { getResourceConfig } from "@/lib/resources";

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

    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", parsedId)
      .query(`SELECT * FROM ${config.table} WHERE ${config.idColumn} = @id`);

    if (result.recordset.length === 0) {
      return error("Registro no encontrado.", 404);
    }

    return ok(result.recordset[0]);
  } catch (e) {
    return error("Error consultando registro.", 500, e instanceof Error ? e.message : e);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  try {
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

    const body = await request.json();
    const entries = config.updatableColumns
      .filter((column) => Object.prototype.hasOwnProperty.call(body, column))
      .map((column) => ({ column, value: body[column] }));

    if (entries.length === 0) {
      return error("No hay columnas actualizables en el payload.", 422);
    }

    const sql = getSqlClient();
    const pool = await getPool();
    const req = pool.request();
    req.input("id", parsedId);

    const setClause = entries
      .map((entry, index) => {
        const paramName = `p${index}`;
        req.input(paramName, entry.value ?? null);
        return `${entry.column} = @${paramName}`;
      })
      .join(", ");

    const query = `
      UPDATE ${config.table}
      SET ${setClause}
      WHERE ${config.idColumn} = @id;

      SELECT @@ROWCOUNT AS affected;
    `;

    const result = await req.query(query);
    const affected = result.recordset[0]?.affected ?? 0;
    if (affected === 0) {
      return error("Registro no encontrado.", 404);
    }
    return ok({ affected });
  } catch (e) {
    if (e instanceof sql.RequestError) {
      return error("Error de validacion/constraint SQL.", 409, e.message);
    }
    return error("Error actualizando registro.", 500, e instanceof Error ? e.message : e);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  try {
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

    const pool = await getPool();
    const result = await pool.request().input("id", parsedId).query(`
      DELETE FROM ${config.table}
      WHERE ${config.idColumn} = @id;
      SELECT @@ROWCOUNT AS affected;
    `);

    const affected = result.recordset[0]?.affected ?? 0;
    if (affected === 0) {
      return error("Registro no encontrado.", 404);
    }

    return ok({ affected });
  } catch (e) {
    return error("Error eliminando registro.", 500, e instanceof Error ? e.message : e);
  }
}
