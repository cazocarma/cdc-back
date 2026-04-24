import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface FamiliaQuimicoRow {
  Id: number;
  Codigo: string;
  Glosa: string;
}

export interface FamiliaQuimicoDto {
  id: number;
  codigo: string;
  glosa: string;
}

export const CreateFamiliaQuimico = z.object({
  codigo: z.string().trim().min(1).max(20),
  glosa: z.string().trim().min(1).max(100),
});

export const UpdateFamiliaQuimico = CreateFamiliaQuimico.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateFamiliaQuimico>;
type UpdateInput = z.infer<typeof UpdateFamiliaQuimico>;

function rowToDto(r: FamiliaQuimicoRow): FamiliaQuimicoDto {
  return { id: r.Id, codigo: r.Codigo, glosa: r.Glosa };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  return [
    col('Codigo', mssql.VarChar(20), i.codigo),
    col('Glosa', mssql.NVarChar(100), i.glosa),
  ];
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.codigo !== undefined) cols.push(col('Codigo', mssql.VarChar(20), i.codigo));
  if (i.glosa !== undefined) cols.push(col('Glosa', mssql.NVarChar(100), i.glosa));
  return cols;
}

export const familiasQuimicosSpec: CrudSpec<FamiliaQuimicoDto, FamiliaQuimicoRow> = {
  table: 'cdc.FamiliaQuimico',
  searchColumns: ['Codigo', 'Glosa'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateFamiliaQuimico,
  updateSchema: UpdateFamiliaQuimico,
};
