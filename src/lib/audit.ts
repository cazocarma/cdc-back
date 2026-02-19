import type { Transaction } from "mssql";

type AuditOperation = "INSERT" | "UPDATE" | "DELETE";

type WriteAuditEntryInput = {
  tx: Transaction;
  idUsuario: number | null;
  operacion: AuditOperation;
  tabla: string;
  pk: string | number;
  detalle?: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
  origen?: string;
  sensitiveColumns?: string[];
};

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function redactSensitiveColumns(
  payload: Record<string, unknown> | null | undefined,
  sensitiveColumns: string[]
): Record<string, unknown> | null {
  if (!payload) {
    return null;
  }

  if (sensitiveColumns.length === 0) {
    return payload;
  }

  const sensitiveSet = new Set(sensitiveColumns.map((item) => item.toLowerCase()));
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    sanitized[key] = sensitiveSet.has(key.toLowerCase()) ? "***" : value;
  }

  return sanitized;
}

function toAuditJson(
  payload: Record<string, unknown> | null | undefined,
  sensitiveColumns: string[]
): string | null {
  const sanitized = redactSensitiveColumns(payload, sensitiveColumns);
  if (!sanitized) {
    return null;
  }

  return JSON.stringify(sanitized, jsonReplacer);
}

export async function writeAuditEntry(input: WriteAuditEntryInput): Promise<void> {
  const request = input.tx.request();
  request.input("id_usuario", input.idUsuario);
  request.input("operacion", input.operacion);
  request.input("tabla", input.tabla);
  request.input("pk", String(input.pk));
  request.input("detalle", input.detalle ?? null);
  request.input("before_json", toAuditJson(input.beforeJson, input.sensitiveColumns ?? []));
  request.input("after_json", toAuditJson(input.afterJson, input.sensitiveColumns ?? []));
  request.input("origen", input.origen ?? "API");

  await request.query(`
    INSERT INTO cdc.CDC_auditoria (
      id_usuario,
      operacion,
      tabla,
      pk,
      detalle,
      before_json,
      after_json,
      origen
    )
    VALUES (
      @id_usuario,
      @operacion,
      @tabla,
      @pk,
      @detalle,
      @before_json,
      @after_json,
      @origen
    );
  `);
}
