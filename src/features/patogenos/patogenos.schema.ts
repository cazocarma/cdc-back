import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface PatogenoRow {
  Id: number;
  Codigo: string;
  Nombre: string;
  Activo: boolean;
}

export interface PatogenoDto {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export const CreatePatogeno = z.object({
  codigo: z.string().trim().min(1).max(20),
  nombre: z.string().trim().min(1).max(200),
  activo: z.boolean().optional(),
});

export const UpdatePatogeno = CreatePatogeno.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreatePatogeno>;
type UpdateInput = z.infer<typeof UpdatePatogeno>;

function rowToDto(r: PatogenoRow): PatogenoDto {
  return { id: r.Id, codigo: r.Codigo, nombre: r.Nombre, activo: r.Activo };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [
    col('Codigo', mssql.VarChar(20), i.codigo),
    col('Nombre', mssql.NVarChar(200), i.nombre),
  ];
  if (i.activo !== undefined) cols.push(col('Activo', mssql.Bit, i.activo));
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.codigo !== undefined) cols.push(col('Codigo', mssql.VarChar(20), i.codigo));
  if (i.nombre !== undefined) cols.push(col('Nombre', mssql.NVarChar(200), i.nombre));
  if (i.activo !== undefined) cols.push(col('Activo', mssql.Bit, i.activo));
  return cols;
}

export const patogenosSpec: CrudSpec<PatogenoDto, PatogenoRow> = {
  table: 'cdc.Patogeno',
  searchColumns: ['Codigo', 'Nombre'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreatePatogeno,
  updateSchema: UpdatePatogeno,
};
