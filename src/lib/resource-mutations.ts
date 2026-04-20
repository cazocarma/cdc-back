import {
  getResourceConfig,
  mapColumnName,
  transformColumnValue,
} from "./resources.js";

export type MutationMode = "insert" | "update";

export type MutationEntry = {
  column: string;
  dbColumn: string;
  value: unknown;
};

type BuildMutationEntriesResult = {
  entries: MutationEntry[];
  details?: unknown;
  message?: string;
};

const MAX_PAYLOAD_KEYS = 100;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasMissingRequiredValue(payload: Record<string, unknown>, field: string): boolean {
  if (!Object.prototype.hasOwnProperty.call(payload, field)) {
    return true;
  }

  const value = payload[field];
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return true;
  }

  return false;
}

export function buildMutationEntries(
  payload: unknown,
  resource: string,
  mode: MutationMode
): BuildMutationEntriesResult {
  const config = getResourceConfig(resource);
  if (!config) {
    return { entries: [], message: "Recurso no soportado." };
  }

  if (!isPlainObject(payload)) {
    return { entries: [], message: "El payload debe ser un objeto JSON." };
  }

  const payloadKeys = Object.keys(payload);
  if (payloadKeys.length > MAX_PAYLOAD_KEYS) {
    return {
      entries: [],
      message: "El payload contiene demasiados campos.",
      details: { maxAllowed: MAX_PAYLOAD_KEYS },
    };
  }

  const allowedColumns = mode === "insert" ? config.insertableColumns : config.updatableColumns;
  const allowedSet = new Set(allowedColumns);
  const unknownFields = payloadKeys.filter((item) => !allowedSet.has(item));

  if (unknownFields.length > 0) {
    return {
      entries: [],
      message: "El payload contiene columnas no permitidas.",
      details: { unknownFields },
    };
  }

  if (mode === "insert" && config.requiredOnInsert && config.requiredOnInsert.length > 0) {
    const missingRequired = config.requiredOnInsert.filter((field) =>
      hasMissingRequiredValue(payload, field)
    );

    if (missingRequired.length > 0) {
      return {
        entries: [],
        message: "Faltan campos obligatorios para crear el registro.",
        details: { missingRequired },
      };
    }
  }

  const entriesMap = new Map<string, MutationEntry>();

  for (const column of allowedColumns) {
    if (!Object.prototype.hasOwnProperty.call(payload, column)) {
      continue;
    }

    const rawValue = payload[column];
    if (rawValue === undefined) {
      continue;
    }

    let transformedValue: unknown;

    try {
      transformedValue = transformColumnValue(config, column, rawValue);
    } catch (e) {
      return {
        entries: [],
        message: "Valor invalido para el payload enviado.",
        details: {
          column,
          reason: e instanceof Error ? e.message : String(e),
        },
      };
    }

    const dbColumn = mapColumnName(config, column);
    entriesMap.set(dbColumn, {
      column,
      dbColumn,
      value: transformedValue ?? null,
    });
  }

  return {
    entries: Array.from(entriesMap.values()),
  };
}
