import { hashPassword } from "@/lib/password";

export type ValueTransformer = (value: unknown) => unknown;

export type ResourceConfig = {
  table: string;
  idColumn: string;
  selectableColumns?: string[];
  insertableColumns: string[];
  updatableColumns: string[];
  searchColumns?: string[];
  readOnly?: boolean;
  requiredOnInsert?: string[];
  columnMap?: Record<string, string>;
  valueTransformers?: Record<string, ValueTransformer>;
  sensitiveColumns?: string[];
};

function passwordToHashTransformer(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("El campo password debe ser texto.");
  }
  return hashPassword(value);
}

export const RESOURCE_CONFIG: Record<string, ResourceConfig> = {
  usuarios: {
    table: "cdc.CDC_usuario",
    idColumn: "id_usuario",
    selectableColumns: [
      "id_usuario",
      "usuario",
      "nombre",
      "email",
      "activo",
      "created_at",
      "updated_at",
    ],
    insertableColumns: ["usuario", "nombre", "email", "password", "activo"],
    updatableColumns: ["usuario", "nombre", "email", "password", "activo"],
    requiredOnInsert: ["usuario", "nombre", "password"],
    columnMap: {
      password: "password_hash",
    },
    valueTransformers: {
      password: passwordToHashTransformer,
    },
    sensitiveColumns: ["password", "password_hash"],
    searchColumns: ["usuario", "nombre", "email"],
  },
  auditoria: {
    table: "cdc.CDC_auditoria",
    idColumn: "id_auditoria",
    insertableColumns: [],
    updatableColumns: [],
    searchColumns: ["tabla", "pk", "detalle", "origen"],
    readOnly: true,
  },
  temporadas: {
    table: "cdc.CDC_temporada",
    idColumn: "id_temporada",
    insertableColumns: ["codigo", "nombre", "fecha_inicio", "fecha_fin", "activa"],
    updatableColumns: ["codigo", "nombre", "fecha_inicio", "fecha_fin", "activa"],
    searchColumns: ["codigo", "nombre"],
  },
  exportadores: {
    table: "cdc.CDC_exportador",
    idColumn: "id_exportador",
    insertableColumns: ["codigo", "nombre", "activo"],
    updatableColumns: ["codigo", "nombre", "activo"],
    searchColumns: ["codigo", "nombre"],
  },
  productores: {
    table: "cdc.CDC_productor",
    idColumn: "id_productor",
    insertableColumns: ["rut", "nombre", "direccion"],
    updatableColumns: ["rut", "nombre", "direccion"],
    searchColumns: ["rut", "nombre", "direccion"],
  },
  agronomos: {
    table: "cdc.CDC_agronomo",
    idColumn: "id_agronomo",
    insertableColumns: ["rut", "nombre", "email"],
    updatableColumns: ["rut", "nombre", "email"],
    searchColumns: ["rut", "nombre", "email"],
  },
  especies: {
    table: "cdc.CDC_especie",
    idColumn: "id_especie",
    insertableColumns: ["codigo_especie", "nombre_comun", "nombre_cientifico", "estado"],
    updatableColumns: ["codigo_especie", "nombre_comun", "nombre_cientifico", "estado"],
    searchColumns: ["codigo_especie", "nombre_comun", "nombre_cientifico"],
  },
  variedades: {
    table: "cdc.CDC_variedad",
    idColumn: "id_variedad",
    insertableColumns: [
      "id_especie",
      "codigo_variedad",
      "nombre_comercial",
      "id_grupo_variedad",
      "grupo_variedad",
      "activo",
    ],
    updatableColumns: [
      "id_especie",
      "codigo_variedad",
      "nombre_comercial",
      "id_grupo_variedad",
      "grupo_variedad",
      "activo",
    ],
    searchColumns: ["codigo_variedad", "nombre_comercial", "grupo_variedad"],
  },
  "condiciones-fruta": {
    table: "cdc.CDC_condicion_fruta",
    idColumn: "id_condicion",
    insertableColumns: ["codigo", "glosa"],
    updatableColumns: ["codigo", "glosa"],
    searchColumns: ["codigo", "glosa"],
  },
  fundos: {
    table: "cdc.CDC_fundo",
    idColumn: "id_fundo",
    insertableColumns: [
      "id_productor",
      "id_agronomo",
      "codigo_sap",
      "codigo_sag",
      "nombre",
      "region",
      "provincia",
      "comuna",
      "direccion",
    ],
    updatableColumns: [
      "id_productor",
      "id_agronomo",
      "codigo_sap",
      "codigo_sag",
      "nombre",
      "region",
      "provincia",
      "comuna",
      "direccion",
    ],
    searchColumns: ["codigo_sap", "codigo_sag", "nombre", "region", "provincia", "comuna"],
  },
  predios: {
    table: "cdc.CDC_predio",
    idColumn: "id_predio",
    insertableColumns: [
      "id_fundo",
      "codigo_sap",
      "codigo_sag",
      "superficie",
      "georef_latitud",
      "georef_longitud",
      "georef_fuente",
      "georef_precision",
      "georef_fecha",
    ],
    updatableColumns: [
      "id_fundo",
      "codigo_sap",
      "codigo_sag",
      "superficie",
      "georef_latitud",
      "georef_longitud",
      "georef_fuente",
      "georef_precision",
      "georef_fecha",
    ],
    searchColumns: ["codigo_sap", "codigo_sag", "georef_fuente"],
  },
  "familias-quimicos": {
    table: "cdc.CDC_familia_quimico",
    idColumn: "id_familia",
    insertableColumns: ["codigo", "glosa"],
    updatableColumns: ["codigo", "glosa"],
    searchColumns: ["codigo", "glosa"],
  },
  "ingredientes-activos": {
    table: "cdc.CDC_ingrediente_activo",
    idColumn: "id_ingrediente",
    insertableColumns: ["id_familia", "codigo", "glosa"],
    updatableColumns: ["id_familia", "codigo", "glosa"],
    searchColumns: ["codigo", "glosa"],
  },
  "tipos-agua": {
    table: "cdc.CDC_tipo_agua",
    idColumn: "id_tipo_agua",
    insertableColumns: ["codigo", "nombre"],
    updatableColumns: ["codigo", "nombre"],
    searchColumns: ["codigo", "nombre"],
  },
  patogenos: {
    table: "cdc.CDC_patogeno",
    idColumn: "id_patogeno",
    insertableColumns: ["codigo", "nombre", "activo"],
    updatableColumns: ["codigo", "nombre", "activo"],
    searchColumns: ["codigo", "nombre"],
  },
  productos: {
    table: "cdc.CDC_producto",
    idColumn: "id_producto",
    insertableColumns: ["codigo", "glosa", "formulacion", "dosis_estandar", "unidad_medida"],
    updatableColumns: ["codigo", "glosa", "formulacion", "dosis_estandar", "unidad_medida"],
    searchColumns: ["codigo", "glosa", "formulacion", "unidad_medida"],
  },
  "productos-especie": {
    table: "cdc.CDC_producto_especie",
    idColumn: "id_producto_especie",
    insertableColumns: ["id_especie", "id_producto", "activo"],
    updatableColumns: ["id_especie", "id_producto", "activo"],
    searchColumns: [],
  },
  "ingredientes-producto": {
    table: "cdc.CDC_ingrediente_producto",
    idColumn: "id_ingrediente_producto",
    insertableColumns: ["id_ingrediente", "id_producto"],
    updatableColumns: ["id_ingrediente", "id_producto"],
    searchColumns: [],
  },
  mercados: {
    table: "cdc.CDC_mercado",
    idColumn: "id_mercado",
    insertableColumns: ["nombre", "activo"],
    updatableColumns: ["nombre", "activo"],
    searchColumns: ["nombre"],
  },
  reglas: {
    table: "cdc.CDC_regla",
    idColumn: "id_regla",
    insertableColumns: [
      "id_producto_especie",
      "id_mercado",
      "ppm",
      "dias",
      "activo",
      "unidad",
      "vigencia_desde",
      "vigencia_hasta",
      "fuente",
      "fecha_fuente",
    ],
    updatableColumns: [
      "id_producto_especie",
      "id_mercado",
      "ppm",
      "dias",
      "activo",
      "unidad",
      "vigencia_desde",
      "vigencia_hasta",
      "fuente",
      "fecha_fuente",
    ],
    searchColumns: ["ppm", "unidad", "fuente"],
  },
  cuadros: {
    table: "cdc.CDC_cuadro",
    idColumn: "id_cuadro",
    insertableColumns: [
      "id_temporada",
      "id_predio",
      "id_tipo_agua",
      "id_variedad",
      "id_condicion",
      "nombre",
      "estado",
      "observaciones",
      "fecha_estimada_cosecha",
    ],
    updatableColumns: [
      "id_temporada",
      "id_predio",
      "id_tipo_agua",
      "id_variedad",
      "id_condicion",
      "nombre",
      "estado",
      "observaciones",
      "fecha_estimada_cosecha",
    ],
    searchColumns: ["nombre", "observaciones"],
  },
  aplicaciones: {
    table: "cdc.CDC_aplicacion",
    idColumn: "id_aplicacion",
    insertableColumns: [
      "id_temporada",
      "id_cuadro",
      "id_tipo_agua",
      "id_exportador",
      "id_patogeno",
      "id_producto",
      "fecha_aplicacion",
      "dosis_aplicada",
      "observaciones",
    ],
    updatableColumns: [
      "id_temporada",
      "id_cuadro",
      "id_tipo_agua",
      "id_exportador",
      "id_patogeno",
      "id_producto",
      "fecha_aplicacion",
      "dosis_aplicada",
      "observaciones",
    ],
    searchColumns: ["observaciones"],
  },
};

export function getResourceConfig(resource: string): ResourceConfig | null {
  return RESOURCE_CONFIG[resource] ?? null;
}

export function getSelectableColumns(config: ResourceConfig): string[] {
  if (config.selectableColumns && config.selectableColumns.length > 0) {
    return config.selectableColumns;
  }
  return ["*"];
}

export function mapColumnName(config: ResourceConfig, column: string): string {
  return config.columnMap?.[column] ?? column;
}

export function transformColumnValue(
  config: ResourceConfig,
  column: string,
  value: unknown
): unknown {
  const transformer = config.valueTransformers?.[column];
  if (!transformer) {
    return value;
  }
  return transformer(value);
}

export function sanitizeRecord(
  config: ResourceConfig,
  row: Record<string, unknown>
): Record<string, unknown> {
  const sensitiveSet = new Set((config.sensitiveColumns ?? []).map((item) => item.toLowerCase()));
  if (sensitiveSet.size === 0) {
    return row;
  }

  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (sensitiveSet.has(key.toLowerCase())) {
      continue;
    }
    next[key] = value;
  }
  return next;
}
