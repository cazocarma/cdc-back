import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col, isoString, isoStrict } from '../../shared/mappers.js';

export interface AplicacionRow {
  Id: number;
  TemporadaId: number;
  CuadroId: number;
  TipoAguaId: number;
  ExportadorId: number;
  PatogenoId: number;
  ProductoId: number;
  FechaAplicacion: Date;
  DosisAplicada: number;
  Observaciones: string | null;
}

export interface AplicacionDto {
  id: number;
  temporadaId: number;
  cuadroId: number;
  tipoAguaId: number;
  exportadorId: number;
  patogenoId: number;
  productoId: number;
  fechaAplicacion: string;
  dosisAplicada: number;
  observaciones: string;
}

export const CreateAplicacion = z.object({
  temporadaId: z.number().int().positive(),
  cuadroId: z.number().int().positive(),
  tipoAguaId: z.number().int().positive(),
  exportadorId: z.number().int().positive(),
  patogenoId: z.number().int().positive(),
  productoId: z.number().int().positive(),
  fechaAplicacion: isoString,
  dosisAplicada: z.number(),
  observaciones: z.string().trim().max(500).optional().nullable(),
});

export const UpdateAplicacion = CreateAplicacion.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateAplicacion>;
type UpdateInput = z.infer<typeof UpdateAplicacion>;

function rowToDto(r: AplicacionRow): AplicacionDto {
  return {
    id: Number(r.Id),
    temporadaId: r.TemporadaId,
    cuadroId: r.CuadroId,
    tipoAguaId: r.TipoAguaId,
    exportadorId: r.ExportadorId,
    patogenoId: r.PatogenoId,
    productoId: r.ProductoId,
    fechaAplicacion: isoStrict(r.FechaAplicacion),
    dosisAplicada: r.DosisAplicada,
    observaciones: r.Observaciones ?? '',
  };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [
    col('TemporadaId', mssql.Int, i.temporadaId),
    col('CuadroId', mssql.Int, i.cuadroId),
    col('TipoAguaId', mssql.Int, i.tipoAguaId),
    col('ExportadorId', mssql.Int, i.exportadorId),
    col('PatogenoId', mssql.Int, i.patogenoId),
    col('ProductoId', mssql.Int, i.productoId),
    col('FechaAplicacion', mssql.DateTime2, new Date(i.fechaAplicacion)),
    col('DosisAplicada', mssql.Decimal(12, 4), i.dosisAplicada),
  ];
  if (i.observaciones !== undefined)
    cols.push(col('Observaciones', mssql.NVarChar(500), i.observaciones));
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.temporadaId !== undefined) cols.push(col('TemporadaId', mssql.Int, i.temporadaId));
  if (i.cuadroId !== undefined) cols.push(col('CuadroId', mssql.Int, i.cuadroId));
  if (i.tipoAguaId !== undefined) cols.push(col('TipoAguaId', mssql.Int, i.tipoAguaId));
  if (i.exportadorId !== undefined) cols.push(col('ExportadorId', mssql.Int, i.exportadorId));
  if (i.patogenoId !== undefined) cols.push(col('PatogenoId', mssql.Int, i.patogenoId));
  if (i.productoId !== undefined) cols.push(col('ProductoId', mssql.Int, i.productoId));
  if (i.fechaAplicacion !== undefined)
    cols.push(col('FechaAplicacion', mssql.DateTime2, new Date(i.fechaAplicacion)));
  if (i.dosisAplicada !== undefined)
    cols.push(col('DosisAplicada', mssql.Decimal(12, 4), i.dosisAplicada));
  if (i.observaciones !== undefined)
    cols.push(col('Observaciones', mssql.NVarChar(500), i.observaciones));
  return cols;
}

export const aplicacionesSpec: CrudSpec<AplicacionDto, AplicacionRow> = {
  table: 'cdc.Aplicacion',
  searchColumns: ['Observaciones'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateAplicacion,
  updateSchema: UpdateAplicacion,
};
