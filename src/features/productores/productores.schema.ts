import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface ProductorRow {
  Id: number;
  Rut: string;
  Nombre: string;
  Direccion: string | null;
}

export interface ProductorDto {
  id: number;
  rut: string;
  nombre: string;
  direccion: string;
}

export const CreateProductor = z.object({
  rut: z.string().trim().min(1).max(20),
  nombre: z.string().trim().min(1).max(100),
  direccion: z.string().trim().max(200).optional().nullable(),
});

export const UpdateProductor = CreateProductor.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateProductor>;
type UpdateInput = z.infer<typeof UpdateProductor>;

function rowToDto(r: ProductorRow): ProductorDto {
  return { id: r.Id, rut: r.Rut, nombre: r.Nombre, direccion: r.Direccion ?? '' };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [
    col('Rut', mssql.VarChar(20), i.rut),
    col('Nombre', mssql.NVarChar(100), i.nombre),
  ];
  if (i.direccion !== undefined)
    cols.push(col('Direccion', mssql.NVarChar(200), i.direccion));
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.rut !== undefined) cols.push(col('Rut', mssql.VarChar(20), i.rut));
  if (i.nombre !== undefined) cols.push(col('Nombre', mssql.NVarChar(100), i.nombre));
  if (i.direccion !== undefined) cols.push(col('Direccion', mssql.NVarChar(200), i.direccion));
  return cols;
}

export const productoresSpec: CrudSpec<ProductorDto, ProductorRow> = {
  table: 'cdc.Productor',
  searchColumns: ['Rut', 'Nombre'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateProductor,
  updateSchema: UpdateProductor,
};
