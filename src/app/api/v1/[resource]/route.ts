import { NextRequest } from "next/server";
import type { Transaction } from "mssql";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { writeAuditEntry } from "@/lib/audit";
import { getPool } from "@/lib/db";
import { error, ok, parsePositiveInt } from "@/lib/http";
import { buildMutationEntries } from "@/lib/resource-mutations";
import {
  getResourceConfig,
  getSelectableColumns,
  sanitizeRecord,
} from "@/lib/resources";
import { mapSqlError } from "@/lib/sql-errors";

const listSchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  q: z.string().optional(),
});

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    const config = getResourceConfig(resource);
    if (!config) {
      return error("Recurso no soportado.", 404);
    }

    const parsed = listSchema.parse({
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
      q: request.nextUrl.searchParams.get("q") ?? undefined,
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

    return ok({
      page,
      pageSize,
      total: countResult.recordset[0]?.total ?? 0,
      data: listResult.recordset.map((row) => sanitizeRecord(config, row)),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return error("Querystring invalida.", 422, e.flatten());
    }
    return error("Error consultando recurso.", 500, e instanceof Error ? e.message : e);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  const config = getResourceConfig(resource);

  if (!config) {
    return error("Recurso no soportado.", 404);
  }
  if (config.readOnly) {
    return error("Recurso de solo lectura.", 405);
  }

  const authUser = await getAuthUser(request);
  if (!authUser) {
    return error("Unauthorized.", 401);
  }

  let tx: Transaction | null = null;

  try {
    const body = await request.json();
    const builtEntries = buildMutationEntries(body, resource, "insert");

    if (builtEntries.message) {
      return error(builtEntries.message, 422, builtEntries.details);
    }

    if (builtEntries.entries.length === 0) {
      return error("No hay columnas insertables en el payload.", 422);
    }

    const pool = await getPool();
    tx = pool.transaction();
    await tx.begin();

    const req = tx.request();

    const columns = builtEntries.entries.map((entry) => entry.dbColumn).join(", ");
    const paramsSql = builtEntries.entries
      .map((entry, index) => {
        const paramName = `p${index}`;
        req.input(paramName, entry.value);
        return `@${paramName}`;
      })
      .join(", ");

    const query = `
      INSERT INTO ${config.table} (${columns})
      OUTPUT INSERTED.*
      VALUES (${paramsSql});
    `;

    const result = await req.query(query);
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

    return ok(
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
      return error(sqlError.message, sqlError.status);
    }

    return error("Error insertando registro.", 500, e instanceof Error ? e.message : e);
  }
}
