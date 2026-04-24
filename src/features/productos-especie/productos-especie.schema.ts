import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface ProductoEspecieRow {
  Id: number;
  EspecieId: number;
  ProductoId: number;
  Activo: boolean;
}

export interface ProductoEspecieDto {
  id: number;
  especieId: number;
  productoId: number;
  activo: boolean;
}

export const CreateProductoEspecie = z.object({
  especieId: z.number().int().positive(),
  productoId: z.number().int().positive(),
  activo: z.boolean().optional(),
});

export const UpdateProductoEspecie = CreateProductoEspecie.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateProductoEspecie>;
type UpdateInput = z.infer<typeof UpdateProductoEspecie>;

function rowToDto(r: ProductoEspecieRow): ProductoEspecieDto {
  return {
    id: Number(r.Id),
    especieId: r.EspecieId,
    productoId: r.ProductoId,
    activo: r.Activo,
  };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [
    col('EspecieId', mssql.Int, i.especieId),
    col('ProductoId', mssql.Int, i.productoId),
  ];
  if (i.activo !== undefined) cols.push(col('Activo', mssql.Bit, i.activo));
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.especieId !== undefined) cols.push(col('EspecieId', mssql.Int, i.especieId));
  if (i.productoId !== undefined) cols.push(col('ProductoId', mssql.Int, i.productoId));
  if (i.activo !== undefined) cols.push(col('Activo', mssql.Bit, i.activo));
  return cols;
}

export const productosEspecieSpec: CrudSpec<ProductoEspecieDto, ProductoEspecieRow> = {
  table: 'cdc.ProductoEspecie',
  searchColumns: undefined,
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateProductoEspecie,
  updateSchema: UpdateProductoEspecie,
};
