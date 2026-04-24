import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col, isoOrNull, isoString } from '../../shared/mappers.js';

export interface ReglaRow {
  Id: number;
  ProductoEspecieId: number;
  MercadoId: number;
  Ppm: string;
  Dias: number;
  Activo: boolean;
  Unidad: string;
  VigenciaDesde: Date;
  VigenciaHasta: Date | null;
  Fuente: string | null;
  FechaFuente: Date | null;
}

export interface ReglaDto {
  id: number;
  productoEspecieId: number;
  mercadoId: number;
  ppm: string;
  dias: number;
  activo: boolean;
  unidad: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  fuente: string;
  fechaFuente: string;
}

// ppm: el front declara string y admite 'ST'/'EX'/numero-como-string.
// NUNCA coercer a numero (el plan §5.6 es explicito).
export const CreateRegla = z.object({
  productoEspecieId: z.number().int().positive(),
  mercadoId: z.number().int().positive(),
  ppm: z.string().trim().min(1).max(20),
  dias: z.number().int(),
  activo: z.boolean().optional(),
  unidad: z.string().trim().max(20).optional(),
  vigenciaDesde: isoString.optional(),
  vigenciaHasta: isoString.optional().nullable(),
  fuente: z.string().trim().max(100).optional().nullable(),
  fechaFuente: isoString.optional().nullable(),
});

export const UpdateRegla = CreateRegla.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateRegla>;
type UpdateInput = z.infer<typeof UpdateRegla>;

function rowToDto(r: ReglaRow): ReglaDto {
  return {
    id: r.Id,
    productoEspecieId: Number(r.ProductoEspecieId),
    mercadoId: r.MercadoId,
    ppm: r.Ppm,
    dias: r.Dias,
    activo: r.Activo,
    unidad: r.Unidad,
    vigenciaDesde: isoOrNull(r.VigenciaDesde) ?? '',
    vigenciaHasta: isoOrNull(r.VigenciaHasta) ?? '',
    fuente: r.Fuente ?? '',
    fechaFuente: isoOrNull(r.FechaFuente) ?? '',
  };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [
    col('ProductoEspecieId', mssql.BigInt, i.productoEspecieId),
    col('MercadoId', mssql.Int, i.mercadoId),
    col('Ppm', mssql.VarChar(20), i.ppm),
    col('Dias', mssql.Int, i.dias),
  ];
  if (i.activo !== undefined) cols.push(col('Activo', mssql.Bit, i.activo));
  if (i.unidad !== undefined) cols.push(col('Unidad', mssql.VarChar(20), i.unidad));
  if (i.vigenciaDesde !== undefined)
    cols.push(col('VigenciaDesde', mssql.DateTime2, new Date(i.vigenciaDesde)));
  if (i.vigenciaHasta !== undefined)
    cols.push(
      col('VigenciaHasta', mssql.DateTime2, i.vigenciaHasta ? new Date(i.vigenciaHasta) : null)
    );
  if (i.fuente !== undefined) cols.push(col('Fuente', mssql.NVarChar(100), i.fuente));
  if (i.fechaFuente !== undefined)
    cols.push(
      col('FechaFuente', mssql.DateTime2, i.fechaFuente ? new Date(i.fechaFuente) : null)
    );
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.productoEspecieId !== undefined)
    cols.push(col('ProductoEspecieId', mssql.BigInt, i.productoEspecieId));
  if (i.mercadoId !== undefined) cols.push(col('MercadoId', mssql.Int, i.mercadoId));
  if (i.ppm !== undefined) cols.push(col('Ppm', mssql.VarChar(20), i.ppm));
  if (i.dias !== undefined) cols.push(col('Dias', mssql.Int, i.dias));
  if (i.activo !== undefined) cols.push(col('Activo', mssql.Bit, i.activo));
  if (i.unidad !== undefined) cols.push(col('Unidad', mssql.VarChar(20), i.unidad));
  if (i.vigenciaDesde !== undefined)
    cols.push(col('VigenciaDesde', mssql.DateTime2, new Date(i.vigenciaDesde)));
  if (i.vigenciaHasta !== undefined)
    cols.push(
      col('VigenciaHasta', mssql.DateTime2, i.vigenciaHasta ? new Date(i.vigenciaHasta) : null)
    );
  if (i.fuente !== undefined) cols.push(col('Fuente', mssql.NVarChar(100), i.fuente));
  if (i.fechaFuente !== undefined)
    cols.push(
      col('FechaFuente', mssql.DateTime2, i.fechaFuente ? new Date(i.fechaFuente) : null)
    );
  return cols;
}

export const reglasSpec: CrudSpec<ReglaDto, ReglaRow> = {
  table: 'cdc.Regla',
  searchColumns: ['Fuente', 'Ppm', 'Unidad'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateRegla,
  updateSchema: UpdateRegla,
};
