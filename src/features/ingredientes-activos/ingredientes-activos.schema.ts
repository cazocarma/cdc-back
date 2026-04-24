import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface IngredienteActivoRow {
  Id: number;
  FamiliaId: number;
  Codigo: string;
  Glosa: string;
}

export interface IngredienteActivoDto {
  id: number;
  familiaId: number;
  codigo: string;
  glosa: string;
}

export const CreateIngredienteActivo = z.object({
  familiaId: z.number().int().positive(),
  codigo: z.string().trim().min(1).max(20),
  glosa: z.string().trim().min(1).max(200),
});

export const UpdateIngredienteActivo = CreateIngredienteActivo.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateIngredienteActivo>;
type UpdateInput = z.infer<typeof UpdateIngredienteActivo>;

function rowToDto(r: IngredienteActivoRow): IngredienteActivoDto {
  return { id: r.Id, familiaId: r.FamiliaId, codigo: r.Codigo, glosa: r.Glosa };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  return [
    col('FamiliaId', mssql.Int, i.familiaId),
    col('Codigo', mssql.VarChar(20), i.codigo),
    col('Glosa', mssql.NVarChar(200), i.glosa),
  ];
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.familiaId !== undefined) cols.push(col('FamiliaId', mssql.Int, i.familiaId));
  if (i.codigo !== undefined) cols.push(col('Codigo', mssql.VarChar(20), i.codigo));
  if (i.glosa !== undefined) cols.push(col('Glosa', mssql.NVarChar(200), i.glosa));
  return cols;
}

export const ingredientesActivosSpec: CrudSpec<IngredienteActivoDto, IngredienteActivoRow> = {
  table: 'cdc.IngredienteActivo',
  searchColumns: ['Codigo', 'Glosa'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateIngredienteActivo,
  updateSchema: UpdateIngredienteActivo,
};
