import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface IngredienteProductoRow {
  Id: number;
  IngredienteId: number;
  ProductoId: number;
}

export interface IngredienteProductoDto {
  id: number;
  ingredienteId: number;
  productoId: number;
}

export const CreateIngredienteProducto = z.object({
  ingredienteId: z.number().int().positive(),
  productoId: z.number().int().positive(),
});

export const UpdateIngredienteProducto = CreateIngredienteProducto.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateIngredienteProducto>;
type UpdateInput = z.infer<typeof UpdateIngredienteProducto>;

function rowToDto(r: IngredienteProductoRow): IngredienteProductoDto {
  return {
    id: Number(r.Id),
    ingredienteId: r.IngredienteId,
    productoId: r.ProductoId,
  };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  return [
    col('IngredienteId', mssql.Int, i.ingredienteId),
    col('ProductoId', mssql.Int, i.productoId),
  ];
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.ingredienteId !== undefined)
    cols.push(col('IngredienteId', mssql.Int, i.ingredienteId));
  if (i.productoId !== undefined) cols.push(col('ProductoId', mssql.Int, i.productoId));
  return cols;
}

export const ingredientesProductoSpec: CrudSpec<
  IngredienteProductoDto,
  IngredienteProductoRow
> = {
  table: 'cdc.IngredienteProducto',
  searchColumns: undefined,
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateIngredienteProducto,
  updateSchema: UpdateIngredienteProducto,
};
