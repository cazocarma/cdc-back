import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col, isoOrNull, isoString } from '../../shared/mappers.js';

export interface PredioRow {
  Id: number;
  FundoId: number;
  CodigoSap: string;
  CodigoSag: string;
  Superficie: number;
  GeorefLatitud: number | null;
  GeorefLongitud: number | null;
  GeorefFuente: string | null;
  GeorefPrecision: number | null;
  GeorefFecha: Date | null;
}

export interface PredioDto {
  id: number;
  fundoId: number;
  codigoSap: string;
  codigoSag: string;
  superficie: number;
  georefLatitud: number;
  georefLongitud: number;
  georefFuente: string;
  georefPrecision: number;
  georefFecha: string;
}

export const CreatePredio = z.object({
  fundoId: z.number().int().positive(),
  codigoSap: z.string().trim().min(1).max(20),
  codigoSag: z.string().trim().min(1).max(20),
  superficie: z.number(),
  georefLatitud: z.number().optional().nullable(),
  georefLongitud: z.number().optional().nullable(),
  georefFuente: z.string().trim().max(20).optional().nullable(),
  georefPrecision: z.number().int().optional().nullable(),
  georefFecha: isoString.optional().nullable(),
});

export const UpdatePredio = CreatePredio.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreatePredio>;
type UpdateInput = z.infer<typeof UpdatePredio>;

function rowToDto(r: PredioRow): PredioDto {
  return {
    id: r.Id,
    fundoId: r.FundoId,
    codigoSap: r.CodigoSap,
    codigoSag: r.CodigoSag,
    superficie: r.Superficie,
    georefLatitud: r.GeorefLatitud ?? 0,
    georefLongitud: r.GeorefLongitud ?? 0,
    georefFuente: r.GeorefFuente ?? '',
    georefPrecision: r.GeorefPrecision ?? 0,
    georefFecha: isoOrNull(r.GeorefFecha) ?? '',
  };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [
    col('FundoId', mssql.Int, i.fundoId),
    col('CodigoSap', mssql.VarChar(20), i.codigoSap),
    col('CodigoSag', mssql.VarChar(20), i.codigoSag),
    col('Superficie', mssql.Decimal(12, 4), i.superficie),
  ];
  if (i.georefLatitud !== undefined)
    cols.push(col('GeorefLatitud', mssql.Decimal(9, 6), i.georefLatitud));
  if (i.georefLongitud !== undefined)
    cols.push(col('GeorefLongitud', mssql.Decimal(9, 6), i.georefLongitud));
  if (i.georefFuente !== undefined)
    cols.push(col('GeorefFuente', mssql.VarChar(20), i.georefFuente));
  if (i.georefPrecision !== undefined)
    cols.push(col('GeorefPrecision', mssql.Int, i.georefPrecision));
  if (i.georefFecha !== undefined)
    cols.push(
      col('GeorefFecha', mssql.DateTime2, i.georefFecha ? new Date(i.georefFecha) : null)
    );
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.fundoId !== undefined) cols.push(col('FundoId', mssql.Int, i.fundoId));
  if (i.codigoSap !== undefined) cols.push(col('CodigoSap', mssql.VarChar(20), i.codigoSap));
  if (i.codigoSag !== undefined) cols.push(col('CodigoSag', mssql.VarChar(20), i.codigoSag));
  if (i.superficie !== undefined)
    cols.push(col('Superficie', mssql.Decimal(12, 4), i.superficie));
  if (i.georefLatitud !== undefined)
    cols.push(col('GeorefLatitud', mssql.Decimal(9, 6), i.georefLatitud));
  if (i.georefLongitud !== undefined)
    cols.push(col('GeorefLongitud', mssql.Decimal(9, 6), i.georefLongitud));
  if (i.georefFuente !== undefined)
    cols.push(col('GeorefFuente', mssql.VarChar(20), i.georefFuente));
  if (i.georefPrecision !== undefined)
    cols.push(col('GeorefPrecision', mssql.Int, i.georefPrecision));
  if (i.georefFecha !== undefined)
    cols.push(
      col('GeorefFecha', mssql.DateTime2, i.georefFecha ? new Date(i.georefFecha) : null)
    );
  return cols;
}

export const prediosSpec: CrudSpec<PredioDto, PredioRow> = {
  table: 'cdc.Predio',
  searchColumns: ['CodigoSap', 'CodigoSag'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreatePredio,
  updateSchema: UpdatePredio,
};
