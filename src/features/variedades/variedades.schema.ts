import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface VariedadRow {
  Id: number;
  EspecieId: number;
  CodigoVariedad: string;
  NombreComercial: string;
  CodigoGrupo: string;
  GrupoVariedad: string;
  Activo: boolean;
}

export interface VariedadDto {
  id: number;
  especieId: number;
  codigoVariedad: string;
  nombreComercial: string;
  codigoGrupo: string;
  grupoVariedad: string;
  activo: boolean;
}

export const CreateVariedad = z.object({
  especieId: z.number().int().positive(),
  codigoVariedad: z.string().trim().min(1).max(20),
  nombreComercial: z.string().trim().min(1).max(100),
  codigoGrupo: z.string().trim().min(1).max(20),
  grupoVariedad: z.string().trim().min(1).max(100),
  activo: z.boolean().optional(),
});

export const UpdateVariedad = CreateVariedad.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateVariedad>;
type UpdateInput = z.infer<typeof UpdateVariedad>;

function rowToDto(r: VariedadRow): VariedadDto {
  return {
    id: r.Id,
    especieId: r.EspecieId,
    codigoVariedad: r.CodigoVariedad,
    nombreComercial: r.NombreComercial,
    codigoGrupo: r.CodigoGrupo,
    grupoVariedad: r.GrupoVariedad,
    activo: r.Activo,
  };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [
    col('EspecieId', mssql.Int, i.especieId),
    col('CodigoVariedad', mssql.VarChar(20), i.codigoVariedad),
    col('NombreComercial', mssql.NVarChar(100), i.nombreComercial),
    col('CodigoGrupo', mssql.VarChar(20), i.codigoGrupo),
    col('GrupoVariedad', mssql.NVarChar(100), i.grupoVariedad),
  ];
  if (i.activo !== undefined) cols.push(col('Activo', mssql.Bit, i.activo));
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.especieId !== undefined) cols.push(col('EspecieId', mssql.Int, i.especieId));
  if (i.codigoVariedad !== undefined)
    cols.push(col('CodigoVariedad', mssql.VarChar(20), i.codigoVariedad));
  if (i.nombreComercial !== undefined)
    cols.push(col('NombreComercial', mssql.NVarChar(100), i.nombreComercial));
  if (i.codigoGrupo !== undefined)
    cols.push(col('CodigoGrupo', mssql.VarChar(20), i.codigoGrupo));
  if (i.grupoVariedad !== undefined)
    cols.push(col('GrupoVariedad', mssql.NVarChar(100), i.grupoVariedad));
  if (i.activo !== undefined) cols.push(col('Activo', mssql.Bit, i.activo));
  return cols;
}

export const variedadesSpec: CrudSpec<VariedadDto, VariedadRow> = {
  table: 'cdc.Variedad',
  searchColumns: ['CodigoVariedad', 'NombreComercial', 'GrupoVariedad'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateVariedad,
  updateSchema: UpdateVariedad,
};
