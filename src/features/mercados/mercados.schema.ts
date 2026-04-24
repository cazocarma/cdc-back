import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface MercadoRow {
  Id: number;
  Nombre: string;
  Activo: boolean;
}

export interface MercadoDto {
  id: number;
  nombre: string;
  activo: boolean;
}

export const CreateMercado = z.object({
  nombre: z.string().trim().min(1).max(100),
  activo: z.boolean().optional(),
});

export const UpdateMercado = CreateMercado.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateMercado>;
type UpdateInput = z.infer<typeof UpdateMercado>;

function rowToDto(r: MercadoRow): MercadoDto {
  return { id: r.Id, nombre: r.Nombre, activo: r.Activo };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [col('Nombre', mssql.NVarChar(100), i.nombre)];
  if (i.activo !== undefined) cols.push(col('Activo', mssql.Bit, i.activo));
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.nombre !== undefined) cols.push(col('Nombre', mssql.NVarChar(100), i.nombre));
  if (i.activo !== undefined) cols.push(col('Activo', mssql.Bit, i.activo));
  return cols;
}

export const mercadosSpec: CrudSpec<MercadoDto, MercadoRow> = {
  table: 'cdc.Mercado',
  searchColumns: ['Nombre'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateMercado,
  updateSchema: UpdateMercado,
};
