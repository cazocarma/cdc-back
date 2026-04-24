import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface CondicionFrutaRow {
  Id: number;
  Codigo: string | null;
  Glosa: string | null;
}

export interface CondicionFrutaDto {
  id: number;
  codigo: string;
  glosa: string;
}

const CondicionFrutaBody = z.object({
  codigo: z.string().trim().max(20).optional().nullable(),
  glosa: z.string().trim().max(100).optional().nullable(),
});

export const CreateCondicionFruta = CondicionFrutaBody.refine(
  (o) => o.codigo !== undefined || o.glosa !== undefined,
  { message: 'Debe enviar al menos codigo o glosa' }
);

export const UpdateCondicionFruta = CondicionFrutaBody.refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateCondicionFruta>;
type UpdateInput = z.infer<typeof UpdateCondicionFruta>;

function rowToDto(r: CondicionFrutaRow): CondicionFrutaDto {
  return { id: r.Id, codigo: r.Codigo ?? '', glosa: r.Glosa ?? '' };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [];
  if (i.codigo !== undefined) cols.push(col('Codigo', mssql.VarChar(20), i.codigo));
  if (i.glosa !== undefined) cols.push(col('Glosa', mssql.NVarChar(100), i.glosa));
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.codigo !== undefined) cols.push(col('Codigo', mssql.VarChar(20), i.codigo));
  if (i.glosa !== undefined) cols.push(col('Glosa', mssql.NVarChar(100), i.glosa));
  return cols;
}

export const condicionesFrutaSpec: CrudSpec<CondicionFrutaDto, CondicionFrutaRow> = {
  table: 'cdc.CondicionFruta',
  searchColumns: ['Codigo', 'Glosa'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateCondicionFruta,
  updateSchema: UpdateCondicionFruta,
};
