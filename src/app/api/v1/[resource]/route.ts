import { NextRequest } from "next/server";
import { z } from "zod";
import { getPool, getSqlClient } from "@/lib/db";
import { error, ok, parsePositiveInt } from "@/lib/http";
import { getResourceConfig } from "@/lib/resources";

const listSchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  q: z.string().optional(),
});

function buildWhereClause(
  q: string | undefined,
  searchColumns: string[] | undefined
): { whereSql: string; searchValue: string | null } {
  if (!q || !searchColumns || searchColumns.length === 0) {
    return { whereSql: "", searchValue: null };
  }

  const predicates = searchColumns.map((column) => `${column} LIKE @q`).join(" OR ");
  return {
    whereSql: ` WHERE (${predicates})`,
    searchValue: `%${q}%`,
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
    const pageSize = Math.min(parsePositiveInt(parsed.pageSize ?? null, 20), 100);
    const offset = (page - 1) * pageSize;
    const { whereSql, searchValue } = buildWhereClause(parsed.q, config.searchColumns);

    const pool = await getPool();
    const countReq = pool.request();
    const listReq = pool.request();
    countReq.input("offset", offset);
    countReq.input("pageSize", pageSize);
    listReq.input("offset", offset);
    listReq.input("pageSize", pageSize);
    if (searchValue) {
      countReq.input("q", searchValue);
      listReq.input("q", searchValue);
    }

    const countQuery = `SELECT COUNT(1) AS total FROM ${config.table}${whereSql};`;
    const listQuery = `
      SELECT *
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
      data: listResult.recordset,
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
  try {
    const { resource } = await params;
    const config = getResourceConfig(resource);
    if (!config) {
      return error("Recurso no soportado.", 404);
    }
    if (config.readOnly) {
      return error("Recurso de solo lectura.", 405);
    }

    const body = await request.json();
    const entries = config.insertableColumns
      .filter((column) => Object.prototype.hasOwnProperty.call(body, column))
      .map((column) => ({ column, value: body[column] }));

    if (entries.length === 0) {
      return error("No hay columnas insertables en el payload.", 422);
    }

    const sql = getSqlClient();
    const pool = await getPool();
    const req = pool.request();

    const columns = entries.map((entry) => entry.column).join(", ");
    const paramsSql = entries
      .map((entry, index) => {
        const paramName = `p${index}`;
        req.input(paramName, entry.value ?? null);
        return `@${paramName}`;
      })
      .join(", ");

    const query = `
      INSERT INTO ${config.table} (${columns})
      OUTPUT INSERTED.${config.idColumn} AS id
      VALUES (${paramsSql});
    `;

    const result = await req.query(query);
    const id = result.recordset[0]?.id;
    return ok({ id }, 201);
  } catch (e) {
    if (e instanceof sql.RequestError) {
      return error("Error de validacion/constraint SQL.", 409, e.message);
    }
    return error("Error insertando registro.", 500, e instanceof Error ? e.message : e);
  }
}
