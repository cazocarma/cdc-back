import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface FundoRow {
  Id: number;
  ProductorId: number;
  AgronomoId: number;
  CodigoSap: string;
  CodigoSag: string;
  Nombre: string;
  Region: string;
  Provincia: string;
  Comuna: string;
  Direccion: string | null;
}

export interface FundoDto {
  id: number;
  productorId: number;
  agronomoId: number;
  codigoSap: string;
  codigoSag: string;
  nombre: string;
  region: string;
  provincia: string;
  comuna: string;
  direccion: string;
}

export const CreateFundo = z.object({
  productorId: z.number().int().positive(),
  agronomoId: z.number().int().positive(),
  codigoSap: z.string().trim().min(1).max(20),
  codigoSag: z.string().trim().min(1).max(20),
  nombre: z.string().trim().min(1).max(100),
  region: z.string().trim().min(1).max(100),
  provincia: z.string().trim().min(1).max(100),
  comuna: z.string().trim().min(1).max(100),
  direccion: z.string().trim().max(200).optional().nullable(),
});

export const UpdateFundo = CreateFundo.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateFundo>;
type UpdateInput = z.infer<typeof UpdateFundo>;

function rowToDto(r: FundoRow): FundoDto {
  return {
    id: r.Id,
    productorId: r.ProductorId,
    agronomoId: r.AgronomoId,
    codigoSap: r.CodigoSap,
    codigoSag: r.CodigoSag,
    nombre: r.Nombre,
    region: r.Region,
    provincia: r.Provincia,
    comuna: r.Comuna,
    direccion: r.Direccion ?? '',
  };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [
    col('ProductorId', mssql.Int, i.productorId),
    col('AgronomoId', mssql.Int, i.agronomoId),
    col('CodigoSap', mssql.VarChar(20), i.codigoSap),
    col('CodigoSag', mssql.VarChar(20), i.codigoSag),
    col('Nombre', mssql.NVarChar(100), i.nombre),
    col('Region', mssql.NVarChar(100), i.region),
    col('Provincia', mssql.NVarChar(100), i.provincia),
    col('Comuna', mssql.NVarChar(100), i.comuna),
  ];
  if (i.direccion !== undefined)
    cols.push(col('Direccion', mssql.NVarChar(200), i.direccion));
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.productorId !== undefined) cols.push(col('ProductorId', mssql.Int, i.productorId));
  if (i.agronomoId !== undefined) cols.push(col('AgronomoId', mssql.Int, i.agronomoId));
  if (i.codigoSap !== undefined) cols.push(col('CodigoSap', mssql.VarChar(20), i.codigoSap));
  if (i.codigoSag !== undefined) cols.push(col('CodigoSag', mssql.VarChar(20), i.codigoSag));
  if (i.nombre !== undefined) cols.push(col('Nombre', mssql.NVarChar(100), i.nombre));
  if (i.region !== undefined) cols.push(col('Region', mssql.NVarChar(100), i.region));
  if (i.provincia !== undefined) cols.push(col('Provincia', mssql.NVarChar(100), i.provincia));
  if (i.comuna !== undefined) cols.push(col('Comuna', mssql.NVarChar(100), i.comuna));
  if (i.direccion !== undefined) cols.push(col('Direccion', mssql.NVarChar(200), i.direccion));
  return cols;
}

export const fundosSpec: CrudSpec<FundoDto, FundoRow> = {
  table: 'cdc.Fundo',
  searchColumns: ['Nombre', 'CodigoSap', 'CodigoSag', 'Region', 'Comuna'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateFundo,
  updateSchema: UpdateFundo,
};
