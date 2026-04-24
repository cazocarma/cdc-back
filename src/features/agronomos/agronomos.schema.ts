import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface AgronomoRow {
  Id: number;
  Rut: string;
  Nombre: string;
  Email: string | null;
}

export interface AgronomoDto {
  id: number;
  rut: string;
  nombre: string;
  email: string;
}

export const CreateAgronomo = z.object({
  rut: z.string().trim().min(1).max(20),
  nombre: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(150).optional().nullable(),
});

export const UpdateAgronomo = CreateAgronomo.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateAgronomo>;
type UpdateInput = z.infer<typeof UpdateAgronomo>;

function rowToDto(r: AgronomoRow): AgronomoDto {
  return { id: r.Id, rut: r.Rut, nombre: r.Nombre, email: r.Email ?? '' };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [
    col('Rut', mssql.VarChar(20), i.rut),
    col('Nombre', mssql.NVarChar(100), i.nombre),
  ];
  if (i.email !== undefined) cols.push(col('Email', mssql.NVarChar(150), i.email));
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.rut !== undefined) cols.push(col('Rut', mssql.VarChar(20), i.rut));
  if (i.nombre !== undefined) cols.push(col('Nombre', mssql.NVarChar(100), i.nombre));
  if (i.email !== undefined) cols.push(col('Email', mssql.NVarChar(150), i.email));
  return cols;
}

export const agronomosSpec: CrudSpec<AgronomoDto, AgronomoRow> = {
  table: 'cdc.Agronomo',
  searchColumns: ['Rut', 'Nombre', 'Email'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateAgronomo,
  updateSchema: UpdateAgronomo,
};
