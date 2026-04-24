import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col, isoString, isoStrict } from '../../shared/mappers.js';

export interface CuadroRow {
  Id: number;
  TemporadaId: number;
  PredioId: number;
  TipoAguaId: number;
  VariedadId: number;
  CondicionId: number;
  Nombre: string;
  Estado: number;
  Superficie: number | null;
  Observaciones: string | null;
  FechaEstimadaCosecha: Date;
}

export interface CuadroDto {
  id: number;
  temporadaId: number;
  predioId: number;
  tipoAguaId: number;
  variedadId: number;
  condicionId: number;
  nombre: string;
  estado: number;
  superficie: number;
  observaciones: string;
  fechaEstimadaCosecha: string;
}

export const CreateCuadro = z.object({
  temporadaId: z.number().int().positive(),
  predioId: z.number().int().positive(),
  tipoAguaId: z.number().int().positive(),
  variedadId: z.number().int().positive(),
  condicionId: z.number().int().positive(),
  nombre: z.string().trim().min(1).max(100),
  estado: z.number().int().min(0).max(255),
  superficie: z.number().optional().nullable(),
  observaciones: z.string().trim().max(300).optional().nullable(),
  fechaEstimadaCosecha: isoString,
});

export const UpdateCuadro = CreateCuadro.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateCuadro>;
type UpdateInput = z.infer<typeof UpdateCuadro>;

function rowToDto(r: CuadroRow): CuadroDto {
  return {
    id: r.Id,
    temporadaId: r.TemporadaId,
    predioId: r.PredioId,
    tipoAguaId: r.TipoAguaId,
    variedadId: r.VariedadId,
    condicionId: r.CondicionId,
    nombre: r.Nombre,
    estado: r.Estado,
    superficie: r.Superficie ?? 0,
    observaciones: r.Observaciones ?? '',
    fechaEstimadaCosecha: isoStrict(r.FechaEstimadaCosecha),
  };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [
    col('TemporadaId', mssql.Int, i.temporadaId),
    col('PredioId', mssql.Int, i.predioId),
    col('TipoAguaId', mssql.Int, i.tipoAguaId),
    col('VariedadId', mssql.Int, i.variedadId),
    col('CondicionId', mssql.Int, i.condicionId),
    col('Nombre', mssql.NVarChar(100), i.nombre),
    col('Estado', mssql.TinyInt, i.estado),
    col('FechaEstimadaCosecha', mssql.DateTime2, new Date(i.fechaEstimadaCosecha)),
  ];
  if (i.superficie !== undefined)
    cols.push(col('Superficie', mssql.Decimal(12, 4), i.superficie));
  if (i.observaciones !== undefined)
    cols.push(col('Observaciones', mssql.NVarChar(300), i.observaciones));
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.temporadaId !== undefined) cols.push(col('TemporadaId', mssql.Int, i.temporadaId));
  if (i.predioId !== undefined) cols.push(col('PredioId', mssql.Int, i.predioId));
  if (i.tipoAguaId !== undefined) cols.push(col('TipoAguaId', mssql.Int, i.tipoAguaId));
  if (i.variedadId !== undefined) cols.push(col('VariedadId', mssql.Int, i.variedadId));
  if (i.condicionId !== undefined) cols.push(col('CondicionId', mssql.Int, i.condicionId));
  if (i.nombre !== undefined) cols.push(col('Nombre', mssql.NVarChar(100), i.nombre));
  if (i.estado !== undefined) cols.push(col('Estado', mssql.TinyInt, i.estado));
  if (i.superficie !== undefined)
    cols.push(col('Superficie', mssql.Decimal(12, 4), i.superficie));
  if (i.observaciones !== undefined)
    cols.push(col('Observaciones', mssql.NVarChar(300), i.observaciones));
  if (i.fechaEstimadaCosecha !== undefined)
    cols.push(col('FechaEstimadaCosecha', mssql.DateTime2, new Date(i.fechaEstimadaCosecha)));
  return cols;
}

export const cuadrosSpec: CrudSpec<CuadroDto, CuadroRow> = {
  table: 'cdc.Cuadro',
  searchColumns: ['Nombre', 'Observaciones'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateCuadro,
  updateSchema: UpdateCuadro,
};
