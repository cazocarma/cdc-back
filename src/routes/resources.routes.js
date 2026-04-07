const express = require("express");
const { getPool, sql } = require("../db");
const {
  getResourceConfig,
  RESOURCE_CONFIG,
  buildSelectList,
  quote,
} = require("../resources-config");

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────
function parsePositiveInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function buildWhereClause(q, config) {
  const searchable = config.columns.filter((c) => c.searchable);
  if (!q || searchable.length === 0) {
    return { whereSql: "", searchValue: null };
  }
  const predicates = searchable.map((c) => `${quote(c.db)} LIKE @q`).join(" OR ");
  return { whereSql: ` WHERE (${predicates})`, searchValue: `%${q}%` };
}

// Map an incoming payload (api keys) to writeable column entries.
function pickWriteableEntries(config, body, mode /* 'insert' | 'update' */) {
  const flag = mode === "insert" ? "insertable" : "updatable";
  const entries = [];
  for (const col of config.columns) {
    if (!col[flag]) continue;
    if (!Object.prototype.hasOwnProperty.call(body, col.api)) continue;
    entries.push({ db: col.db, value: body[col.api] });
  }
  return entries;
}

// ── GET /api/v1 — list available resources ─────────────────────────
router.get("/", (_req, res) => {
  res.json({ message: "CDC API v1", resources: Object.keys(RESOURCE_CONFIG) });
});

// ── GET /api/v1/:resource — paginated list ─────────────────────────
router.get("/:resource", async (req, res, next) => {
  try {
    const config = getResourceConfig(req.params.resource);
    if (!config) return res.status(404).json({ message: "Recurso no soportado." });

    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = Math.min(parsePositiveInt(req.query.pageSize, 20), 100);
    const offset = (page - 1) * pageSize;
    const { whereSql, searchValue } = buildWhereClause(req.query.q, config);

    const pool = await getPool();

    const countReq = pool.request();
    const listReq = pool.request();
    countReq.input("offset", offset).input("pageSize", pageSize);
    listReq.input("offset", offset).input("pageSize", pageSize);
    if (searchValue) {
      countReq.input("q", searchValue);
      listReq.input("q", searchValue);
    }

    const selectList = buildSelectList(config);
    const [countResult, listResult] = await Promise.all([
      countReq.query(`SELECT COUNT(1) AS total FROM ${config.table}${whereSql};`),
      listReq.query(`
        SELECT ${selectList} FROM ${config.table}${whereSql}
        ORDER BY ${quote(config.idDb)} DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
      `),
    ]);

    res.json({
      page,
      pageSize,
      total: countResult.recordset[0]?.total ?? 0,
      data: listResult.recordset,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/:resource — create ────────────────────────────────
router.post("/:resource", async (req, res, next) => {
  try {
    const config = getResourceConfig(req.params.resource);
    if (!config) return res.status(404).json({ message: "Recurso no soportado." });
    if (config.readOnly) return res.status(405).json({ message: "Recurso de solo lectura." });

    const entries = pickWriteableEntries(config, req.body, "insert");
    if (entries.length === 0) {
      return res.status(422).json({ message: "No hay columnas insertables en el payload." });
    }

    const pool = await getPool();
    const request = pool.request();

    const columns = entries.map((e) => quote(e.db)).join(", ");
    const paramsSql = entries
      .map((e, i) => {
        request.input(`p${i}`, e.value ?? null);
        return `@p${i}`;
      })
      .join(", ");

    const result = await request.query(`
      INSERT INTO ${config.table} (${columns})
      OUTPUT INSERTED.${quote(config.idDb)} AS id
      VALUES (${paramsSql});
    `);

    res.status(201).json({ id: result.recordset[0]?.id });
  } catch (err) {
    if (err instanceof sql.RequestError) {
      return res.status(409).json({ message: "Error de validacion/constraint SQL.", details: err.message });
    }
    next(err);
  }
});

// ── GET /api/v1/:resource/:id — retrieve ───────────────────────────
router.get("/:resource/:id", async (req, res, next) => {
  try {
    const config = getResourceConfig(req.params.resource);
    if (!config) return res.status(404).json({ message: "Recurso no soportado." });

    const id = parsePositiveInt(req.params.id, null);
    if (!id) return res.status(422).json({ message: "Id invalido." });

    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", id)
      .query(
        `SELECT ${buildSelectList(config)} FROM ${config.table} WHERE ${quote(config.idDb)} = @id`
      );

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Registro no encontrado." });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/v1/:resource/:id — update ─────────────────────────────
router.put("/:resource/:id", async (req, res, next) => {
  try {
    const config = getResourceConfig(req.params.resource);
    if (!config) return res.status(404).json({ message: "Recurso no soportado." });
    if (config.readOnly) return res.status(405).json({ message: "Recurso de solo lectura." });

    const id = parsePositiveInt(req.params.id, null);
    if (!id) return res.status(422).json({ message: "Id invalido." });

    const entries = pickWriteableEntries(config, req.body, "update");
    if (entries.length === 0) {
      return res.status(422).json({ message: "No hay columnas actualizables en el payload." });
    }

    const pool = await getPool();
    const request = pool.request();
    request.input("id", id);

    const setClause = entries
      .map((e, i) => {
        request.input(`p${i}`, e.value ?? null);
        return `${quote(e.db)} = @p${i}`;
      })
      .join(", ");

    const result = await request.query(`
      UPDATE ${config.table} SET ${setClause}
      WHERE ${quote(config.idDb)} = @id;
      SELECT @@ROWCOUNT AS affected;
    `);

    const affected = result.recordset[0]?.affected ?? 0;
    if (affected === 0) return res.status(404).json({ message: "Registro no encontrado." });

    res.json({ affected });
  } catch (err) {
    if (err instanceof sql.RequestError) {
      return res.status(409).json({ message: "Error de validacion/constraint SQL.", details: err.message });
    }
    next(err);
  }
});

// ── DELETE /api/v1/:resource/:id — delete ──────────────────────────
router.delete("/:resource/:id", async (req, res, next) => {
  try {
    const config = getResourceConfig(req.params.resource);
    if (!config) return res.status(404).json({ message: "Recurso no soportado." });
    if (config.readOnly) return res.status(405).json({ message: "Recurso de solo lectura." });

    const id = parsePositiveInt(req.params.id, null);
    if (!id) return res.status(422).json({ message: "Id invalido." });

    const pool = await getPool();
    const result = await pool.request().input("id", id).query(`
      DELETE FROM ${config.table} WHERE ${quote(config.idDb)} = @id;
      SELECT @@ROWCOUNT AS affected;
    `);

    const affected = result.recordset[0]?.affected ?? 0;
    if (affected === 0) return res.status(404).json({ message: "Registro no encontrado." });

    res.json({ affected });
  } catch (err) {
    next(err);
  }
});

module.exports = { resourcesRouter: router };
