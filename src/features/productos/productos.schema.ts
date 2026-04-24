import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface ProductoRow {
  Id: number;
  Codigo: string | null;
  Glosa: string;
  Formulacion: string | null;
  DosisEstandar: number | null;
  UnidadMedida: string | null;
}

export interface ProductoDto {
  id: number;
  codigo: string;
  glosa: string;
  formulacion: string;
  dosisEstandar: number;
  unidadMedida: string;
}

export const CreateProducto = z.object({
  codigo: z.string().trim().max(50).optional().nullable(),
  glosa: z.string().trim().min(1).max(200),
  formulacion: z.string().trim().max(50).optional().nullable(),
  dosisEstandar: z.number().optional().nullable(),
  unidadMedida: z.string().trim().max(20).optional().nullable(),
});

export const UpdateProducto = CreateProducto.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateProducto>;
type UpdateInput = z.infer<typeof UpdateProducto>;

function rowToDto(r: ProductoRow): ProductoDto {
  return {
    id: r.Id,
    codigo: r.Codigo ?? '',
    glosa: r.Glosa,
    formulacion: r.Formulacion ?? '',
    dosisEstandar: r.DosisEstandar ?? 0,
    unidadMedida: r.UnidadMedida ?? '',
  };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [col('Glosa', mssql.NVarChar(200), i.glosa)];
  if (i.codigo !== undefined) cols.push(col('Codigo', mssql.VarChar(50), i.codigo));
  if (i.formulacion !== undefined)
    cols.push(col('Formulacion', mssql.NVarChar(50), i.formulacion));
  if (i.dosisEstandar !== undefined)
    cols.push(col('DosisEstandar', mssql.Decimal(12, 4), i.dosisEstandar));
  if (i.unidadMedida !== undefined)
    cols.push(col('UnidadMedida', mssql.NVarChar(20), i.unidadMedida));
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.codigo !== undefined) cols.push(col('Codigo', mssql.VarChar(50), i.codigo));
  if (i.glosa !== undefined) cols.push(col('Glosa', mssql.NVarChar(200), i.glosa));
  if (i.formulacion !== undefined)
    cols.push(col('Formulacion', mssql.NVarChar(50), i.formulacion));
  if (i.dosisEstandar !== undefined)
    cols.push(col('DosisEstandar', mssql.Decimal(12, 4), i.dosisEstandar));
  if (i.unidadMedida !== undefined)
    cols.push(col('UnidadMedida', mssql.NVarChar(20), i.unidadMedida));
  return cols;
}

export const productosSpec: CrudSpec<ProductoDto, ProductoRow> = {
  table: 'cdc.Producto',
  searchColumns: ['Codigo', 'Glosa', 'Formulacion'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateProducto,
  updateSchema: UpdateProducto,
};
