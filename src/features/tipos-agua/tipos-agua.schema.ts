import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface TipoAguaRow {
  Id: number;
  Codigo: string;
  Nombre: string;
}

export interface TipoAguaDto {
  id: number;
  codigo: string;
  nombre: string;
}

export const CreateTipoAgua = z.object({
  codigo: z.string().trim().min(1).max(20),
  nombre: z.string().trim().min(1).max(100),
});

export const UpdateTipoAgua = CreateTipoAgua.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateTipoAgua>;
type UpdateInput = z.infer<typeof UpdateTipoAgua>;

function rowToDto(r: TipoAguaRow): TipoAguaDto {
  return { id: r.Id, codigo: r.Codigo, nombre: r.Nombre };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  return [
    col('Codigo', mssql.VarChar(20), i.codigo),
    col('Nombre', mssql.NVarChar(100), i.nombre),
  ];
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.codigo !== undefined) cols.push(col('Codigo', mssql.VarChar(20), i.codigo));
  if (i.nombre !== undefined) cols.push(col('Nombre', mssql.NVarChar(100), i.nombre));
  return cols;
}

export const tiposAguaSpec: CrudSpec<TipoAguaDto, TipoAguaRow> = {
  table: 'cdc.TipoAgua',
  searchColumns: ['Codigo', 'Nombre'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateTipoAgua,
  updateSchema: UpdateTipoAgua,
};
