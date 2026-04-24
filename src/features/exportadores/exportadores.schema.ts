import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface ExportadorRow {
  Id: number;
  Codigo: string;
  Nombre: string;
  Activo: boolean;
}

export interface ExportadorDto {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export const CreateExportador = z.object({
  codigo: z.string().trim().min(1).max(20),
  nombre: z.string().trim().min(1).max(100),
  activo: z.boolean().optional(),
});

export const UpdateExportador = CreateExportador.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateExportador>;
type UpdateInput = z.infer<typeof UpdateExportador>;

function rowToDto(r: ExportadorRow): ExportadorDto {
  return { id: r.Id, codigo: r.Codigo, nombre: r.Nombre, activo: r.Activo };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [
    col('Codigo', mssql.VarChar(20), i.codigo),
    col('Nombre', mssql.NVarChar(100), i.nombre),
  ];
  if (i.activo !== undefined) cols.push(col('Activo', mssql.Bit, i.activo));
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.codigo !== undefined) cols.push(col('Codigo', mssql.VarChar(20), i.codigo));
  if (i.nombre !== undefined) cols.push(col('Nombre', mssql.NVarChar(100), i.nombre));
  if (i.activo !== undefined) cols.push(col('Activo', mssql.Bit, i.activo));
  return cols;
}

export const exportadoresSpec: CrudSpec<ExportadorDto, ExportadorRow> = {
  table: 'cdc.Exportador',
  searchColumns: ['Codigo', 'Nombre'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateExportador,
  updateSchema: UpdateExportador,
};
