/**
 * Configuracion de recursos REST.
 *
 * Cada recurso declara el mapeo entre el contrato publico de la API
 * (camelCase, lo que el front consume) y los nombres fisicos en BD
 * (PascalCase). Esto desacopla totalmente el contrato HTTP del modelo
 * de datos: cualquier renombre en una capa solo toca este archivo.
 *
 *   columns: Array<{
 *     api: string,        // nombre expuesto por la API (camelCase)
 *     db: string,         // nombre real de la columna en SQL Server
 *     insertable?: bool,  // se acepta en POST
 *     updatable?: bool,   // se acepta en PUT
 *     searchable?: bool,  // entra al filtro LIKE de ?q=
 *   }>
 *
 * El PK siempre se expone como "id" en la API.
 */

/** @typedef {{ api: string, db: string, insertable?: boolean, updatable?: boolean, searchable?: boolean }} ColumnSpec */
/** @typedef {{ table: string, idDb: string, columns: ColumnSpec[], readOnly?: boolean }} ResourceConfig */

const ID_API = "id";

/** @type {Record<string, ResourceConfig>} */
const RESOURCE_CONFIG = {
  usuarios: {
    table: "cdc.Usuario",
    idDb: "Id",
    columns: [
      { api: "usuario",      db: "Usuario",      insertable: true,                  searchable: true },
      { api: "nombre",       db: "Nombre",       insertable: true, updatable: true, searchable: true },
      { api: "email",        db: "Email",        insertable: true, updatable: true, searchable: true },
      { api: "passwordHash", db: "PasswordHash", insertable: true, updatable: true },
      { api: "activo",       db: "Activo",       insertable: true, updatable: true },
    ],
  },
  auditoria: {
    table: "cdc.Auditoria",
    idDb: "Id",
    readOnly: true,
    columns: [
      { api: "usuarioId",   db: "UsuarioId" },
      { api: "fechaEvento", db: "FechaEvento" },
      { api: "operacion",   db: "Operacion",  searchable: true },
      { api: "tabla",       db: "Tabla",      searchable: true },
      { api: "pk",          db: "Pk",         searchable: true },
      { api: "detalle",     db: "Detalle",    searchable: true },
      { api: "beforeJson",  db: "BeforeJson" },
      { api: "afterJson",   db: "AfterJson" },
      { api: "origen",      db: "Origen",     searchable: true },
    ],
  },
  temporadas: {
    table: "cdc.Temporada",
    idDb: "Id",
    columns: [
      { api: "codigo",      db: "Codigo",      insertable: true, updatable: true, searchable: true },
      { api: "nombre",      db: "Nombre",      insertable: true, updatable: true, searchable: true },
      { api: "fechaInicio", db: "FechaInicio", insertable: true, updatable: true },
      { api: "fechaFin",    db: "FechaFin",    insertable: true, updatable: true },
      { api: "activa",      db: "Activa",      insertable: true, updatable: true },
    ],
  },
  exportadores: {
    table: "cdc.Exportador",
    idDb: "Id",
    columns: [
      { api: "codigo", db: "Codigo", insertable: true, updatable: true, searchable: true },
      { api: "nombre", db: "Nombre", insertable: true, updatable: true, searchable: true },
      { api: "activo", db: "Activo", insertable: true, updatable: true },
    ],
  },
  productores: {
    table: "cdc.Productor",
    idDb: "Id",
    columns: [
      { api: "rut",       db: "Rut",       insertable: true, updatable: true, searchable: true },
      { api: "nombre",    db: "Nombre",    insertable: true, updatable: true, searchable: true },
      { api: "direccion", db: "Direccion", insertable: true, updatable: true, searchable: true },
    ],
  },
  agronomos: {
    table: "cdc.Agronomo",
    idDb: "Id",
    columns: [
      { api: "rut",    db: "Rut",    insertable: true, updatable: true, searchable: true },
      { api: "nombre", db: "Nombre", insertable: true, updatable: true, searchable: true },
      { api: "email",  db: "Email",  insertable: true, updatable: true, searchable: true },
    ],
  },
  especies: {
    table: "cdc.Especie",
    idDb: "Id",
    columns: [
      { api: "codigoEspecie",    db: "CodigoEspecie",    insertable: true, updatable: true, searchable: true },
      { api: "nombreComun",      db: "NombreComun",      insertable: true, updatable: true, searchable: true },
      { api: "nombreCientifico", db: "NombreCientifico", insertable: true, updatable: true, searchable: true },
      { api: "estado",           db: "Estado",           insertable: true, updatable: true },
    ],
  },
  variedades: {
    table: "cdc.Variedad",
    idDb: "Id",
    columns: [
      { api: "especieId",       db: "EspecieId",       insertable: true, updatable: true },
      { api: "codigoVariedad",  db: "CodigoVariedad",  insertable: true, updatable: true, searchable: true },
      { api: "nombreComercial", db: "NombreComercial", insertable: true, updatable: true, searchable: true },
      { api: "codigoGrupo",     db: "CodigoGrupo",     insertable: true, updatable: true },
      { api: "grupoVariedad",   db: "GrupoVariedad",   insertable: true, updatable: true, searchable: true },
      { api: "activo",          db: "Activo",          insertable: true, updatable: true },
    ],
  },
  "condiciones-fruta": {
    table: "cdc.CondicionFruta",
    idDb: "Id",
    columns: [
      { api: "codigo", db: "Codigo", insertable: true, updatable: true, searchable: true },
      { api: "glosa",  db: "Glosa",  insertable: true, updatable: true, searchable: true },
    ],
  },
  fundos: {
    table: "cdc.Fundo",
    idDb: "Id",
    columns: [
      { api: "productorId", db: "ProductorId", insertable: true, updatable: true },
      { api: "agronomoId",  db: "AgronomoId",  insertable: true, updatable: true },
      { api: "codigoSap",   db: "CodigoSap",   insertable: true, updatable: true, searchable: true },
      { api: "codigoSag",   db: "CodigoSag",   insertable: true, updatable: true, searchable: true },
      { api: "nombre",      db: "Nombre",      insertable: true, updatable: true, searchable: true },
      { api: "region",      db: "Region",      insertable: true, updatable: true, searchable: true },
      { api: "provincia",   db: "Provincia",   insertable: true, updatable: true, searchable: true },
      { api: "comuna",      db: "Comuna",      insertable: true, updatable: true, searchable: true },
      { api: "direccion",   db: "Direccion",   insertable: true, updatable: true },
    ],
  },
  predios: {
    table: "cdc.Predio",
    idDb: "Id",
    columns: [
      { api: "fundoId",         db: "FundoId",         insertable: true, updatable: true },
      { api: "codigoSap",       db: "CodigoSap",       insertable: true, updatable: true, searchable: true },
      { api: "codigoSag",       db: "CodigoSag",       insertable: true, updatable: true, searchable: true },
      { api: "superficie",      db: "Superficie",      insertable: true, updatable: true },
      { api: "georefLatitud",   db: "GeorefLatitud",   insertable: true, updatable: true },
      { api: "georefLongitud",  db: "GeorefLongitud",  insertable: true, updatable: true },
      { api: "georefFuente",    db: "GeorefFuente",    insertable: true, updatable: true, searchable: true },
      { api: "georefPrecision", db: "GeorefPrecision", insertable: true, updatable: true },
      { api: "georefFecha",     db: "GeorefFecha",     insertable: true, updatable: true },
    ],
  },
  "familias-quimicos": {
    table: "cdc.FamiliaQuimico",
    idDb: "Id",
    columns: [
      { api: "codigo", db: "Codigo", insertable: true, updatable: true, searchable: true },
      { api: "glosa",  db: "Glosa",  insertable: true, updatable: true, searchable: true },
    ],
  },
  "ingredientes-activos": {
    table: "cdc.IngredienteActivo",
    idDb: "Id",
    columns: [
      { api: "familiaId", db: "FamiliaId", insertable: true, updatable: true },
      { api: "codigo",    db: "Codigo",    insertable: true, updatable: true, searchable: true },
      { api: "glosa",     db: "Glosa",     insertable: true, updatable: true, searchable: true },
    ],
  },
  "tipos-agua": {
    table: "cdc.TipoAgua",
    idDb: "Id",
    columns: [
      { api: "codigo", db: "Codigo", insertable: true, updatable: true, searchable: true },
      { api: "nombre", db: "Nombre", insertable: true, updatable: true, searchable: true },
    ],
  },
  patogenos: {
    table: "cdc.Patogeno",
    idDb: "Id",
    columns: [
      { api: "codigo", db: "Codigo", insertable: true, updatable: true, searchable: true },
      { api: "nombre", db: "Nombre", insertable: true, updatable: true, searchable: true },
      { api: "activo", db: "Activo", insertable: true, updatable: true },
    ],
  },
  productos: {
    table: "cdc.Producto",
    idDb: "Id",
    columns: [
      { api: "codigo",        db: "Codigo",        insertable: true, updatable: true, searchable: true },
      { api: "glosa",         db: "Glosa",         insertable: true, updatable: true, searchable: true },
      { api: "formulacion",   db: "Formulacion",   insertable: true, updatable: true, searchable: true },
      { api: "dosisEstandar", db: "DosisEstandar", insertable: true, updatable: true },
      { api: "unidadMedida",  db: "UnidadMedida",  insertable: true, updatable: true, searchable: true },
    ],
  },
  "productos-especie": {
    table: "cdc.ProductoEspecie",
    idDb: "Id",
    columns: [
      { api: "especieId",  db: "EspecieId",  insertable: true, updatable: true },
      { api: "productoId", db: "ProductoId", insertable: true, updatable: true },
      { api: "activo",     db: "Activo",     insertable: true, updatable: true },
    ],
  },
  "ingredientes-producto": {
    table: "cdc.IngredienteProducto",
    idDb: "Id",
    columns: [
      { api: "ingredienteId", db: "IngredienteId", insertable: true, updatable: true },
      { api: "productoId",    db: "ProductoId",    insertable: true, updatable: true },
    ],
  },
  mercados: {
    table: "cdc.Mercado",
    idDb: "Id",
    columns: [
      { api: "nombre", db: "Nombre", insertable: true, updatable: true, searchable: true },
      { api: "activo", db: "Activo", insertable: true, updatable: true },
    ],
  },
  reglas: {
    table: "cdc.Regla",
    idDb: "Id",
    columns: [
      { api: "productoEspecieId", db: "ProductoEspecieId", insertable: true, updatable: true },
      { api: "mercadoId",         db: "MercadoId",         insertable: true, updatable: true },
      { api: "ppm",               db: "Ppm",               insertable: true, updatable: true, searchable: true },
      { api: "dias",              db: "Dias",              insertable: true, updatable: true },
      { api: "activo",            db: "Activo",            insertable: true, updatable: true },
      { api: "unidad",            db: "Unidad",            insertable: true, updatable: true, searchable: true },
      { api: "vigenciaDesde",     db: "VigenciaDesde",     insertable: true, updatable: true },
      { api: "vigenciaHasta",     db: "VigenciaHasta",     insertable: true, updatable: true },
      { api: "fuente",            db: "Fuente",            insertable: true, updatable: true, searchable: true },
      { api: "fechaFuente",       db: "FechaFuente",       insertable: true, updatable: true },
    ],
  },
  cuadros: {
    table: "cdc.Cuadro",
    idDb: "Id",
    columns: [
      { api: "temporadaId",         db: "TemporadaId",         insertable: true, updatable: true },
      { api: "predioId",            db: "PredioId",            insertable: true, updatable: true },
      { api: "tipoAguaId",          db: "TipoAguaId",          insertable: true, updatable: true },
      { api: "variedadId",          db: "VariedadId",          insertable: true, updatable: true },
      { api: "condicionId",         db: "CondicionId",         insertable: true, updatable: true },
      { api: "nombre",              db: "Nombre",              insertable: true, updatable: true, searchable: true },
      { api: "estado",              db: "Estado",              insertable: true, updatable: true },
      { api: "superficie",          db: "Superficie",          insertable: true, updatable: true },
      { api: "observaciones",       db: "Observaciones",       insertable: true, updatable: true, searchable: true },
      { api: "fechaEstimadaCosecha",db: "FechaEstimadaCosecha",insertable: true, updatable: true },
    ],
  },
  aplicaciones: {
    table: "cdc.Aplicacion",
    idDb: "Id",
    columns: [
      { api: "temporadaId",     db: "TemporadaId",     insertable: true, updatable: true },
      { api: "cuadroId",        db: "CuadroId",        insertable: true, updatable: true },
      { api: "tipoAguaId",      db: "TipoAguaId",      insertable: true, updatable: true },
      { api: "exportadorId",    db: "ExportadorId",    insertable: true, updatable: true },
      { api: "patogenoId",      db: "PatogenoId",      insertable: true, updatable: true },
      { api: "productoId",      db: "ProductoId",      insertable: true, updatable: true },
      { api: "fechaAplicacion", db: "FechaAplicacion", insertable: true, updatable: true },
      { api: "dosisAplicada",   db: "DosisAplicada",   insertable: true, updatable: true },
      { api: "observaciones",   db: "Observaciones",   insertable: true, updatable: true, searchable: true },
    ],
  },
};

// ── Derived helpers ─────────────────────────────────────────────────
function quote(ident) {
  return `[${ident}]`;
}

// Pre-compute the SELECT projection that aliases every DB column back to
// its API name (camelCase), including the PK exposed as "id".
function buildSelectList(config) {
  const parts = [`${quote(config.idDb)} AS ${quote(ID_API)}`];
  for (const col of config.columns) {
    parts.push(`${quote(col.db)} AS ${quote(col.api)}`);
  }
  return parts.join(", ");
}

function getResourceConfig(resource) {
  return RESOURCE_CONFIG[resource] ?? null;
}

module.exports = { RESOURCE_CONFIG, getResourceConfig, buildSelectList, quote, ID_API };
