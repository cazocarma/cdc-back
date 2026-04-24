import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col, isoString, isoStrict } from '../../shared/mappers.js';

export interface TemporadaRow {
  Id: number;
  Codigo: string;
  Nombre: string;
  FechaInicio: Date;
  FechaFin: Date;
  Activa: boolean;
}

export interface TemporadaDto {
  id: number;
  codigo: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
}

export const CreateTemporada = z.object({
  codigo: z.string().trim().min(1).max(20),
  nombre: z.string().trim().min(1).max(100),
  fechaInicio: isoString,
  fechaFin: isoString,
  activa: z.boolean().optional(),
});

export const UpdateTemporada = CreateTemporada.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateTemporada>;
type UpdateInput = z.infer<typeof UpdateTemporada>;

function rowToDto(r: TemporadaRow): TemporadaDto {
  return {
    id: r.Id,
    codigo: r.Codigo,
    nombre: r.Nombre,
    fechaInicio: isoStrict(r.FechaInicio),
    fechaFin: isoStrict(r.FechaFin),
    activa: r.Activa,
  };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [
    col('Codigo', mssql.VarChar(20), i.codigo),
    col('Nombre', mssql.NVarChar(100), i.nombre),
    col('FechaInicio', mssql.DateTime2, new Date(i.fechaInicio)),
    col('FechaFin', mssql.DateTime2, new Date(i.fechaFin)),
  ];
  if (i.activa !== undefined) cols.push(col('Activa', mssql.Bit, i.activa));
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.codigo !== undefined) cols.push(col('Codigo', mssql.VarChar(20), i.codigo));
  if (i.nombre !== undefined) cols.push(col('Nombre', mssql.NVarChar(100), i.nombre));
  if (i.fechaInicio !== undefined)
    cols.push(col('FechaInicio', mssql.DateTime2, new Date(i.fechaInicio)));
  if (i.fechaFin !== undefined)
    cols.push(col('FechaFin', mssql.DateTime2, new Date(i.fechaFin)));
  if (i.activa !== undefined) cols.push(col('Activa', mssql.Bit, i.activa));
  return cols;
}

export const temporadasSpec: CrudSpec<TemporadaDto, TemporadaRow> = {
  table: 'cdc.Temporada',
  searchColumns: ['Codigo', 'Nombre'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateTemporada,
  updateSchema: UpdateTemporada,
};
