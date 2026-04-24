import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface EspecieRow {
  Id: number;
  CodigoEspecie: string;
  NombreComun: string;
  NombreCientifico: string | null;
  Estado: boolean;
}

export interface EspecieDto {
  id: number;
  codigoEspecie: string;
  nombreComun: string;
  nombreCientifico: string;
  estado: boolean;
}

export const CreateEspecie = z.object({
  codigoEspecie: z.string().trim().min(1).max(20),
  nombreComun: z.string().trim().min(1).max(100),
  nombreCientifico: z.string().trim().max(150).optional().nullable(),
  estado: z.boolean().optional(),
});

export const UpdateEspecie = CreateEspecie.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'Cuerpo vacio' }
);

type CreateInput = z.infer<typeof CreateEspecie>;
type UpdateInput = z.infer<typeof UpdateEspecie>;

function rowToDto(r: EspecieRow): EspecieDto {
  return {
    id: r.Id,
    codigoEspecie: r.CodigoEspecie,
    nombreComun: r.NombreComun,
    nombreCientifico: r.NombreCientifico ?? '',
    estado: r.Estado,
  };
}

function toCreateColumns(input: unknown): ColumnInput[] {
  const i = input as CreateInput;
  const cols: ColumnInput[] = [
    col('CodigoEspecie', mssql.VarChar(20), i.codigoEspecie),
    col('NombreComun', mssql.NVarChar(100), i.nombreComun),
  ];
  if (i.nombreCientifico !== undefined)
    cols.push(col('NombreCientifico', mssql.NVarChar(150), i.nombreCientifico));
  if (i.estado !== undefined) cols.push(col('Estado', mssql.Bit, i.estado));
  return cols;
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.codigoEspecie !== undefined)
    cols.push(col('CodigoEspecie', mssql.VarChar(20), i.codigoEspecie));
  if (i.nombreComun !== undefined)
    cols.push(col('NombreComun', mssql.NVarChar(100), i.nombreComun));
  if (i.nombreCientifico !== undefined)
    cols.push(col('NombreCientifico', mssql.NVarChar(150), i.nombreCientifico));
  if (i.estado !== undefined) cols.push(col('Estado', mssql.Bit, i.estado));
  return cols;
}

export const especiesSpec: CrudSpec<EspecieDto, EspecieRow> = {
  table: 'cdc.Especie',
  searchColumns: ['CodigoEspecie', 'NombreComun', 'NombreCientifico'],
  rowToDto,
  toCreateColumns,
  toUpdateColumns,
  createSchema: CreateEspecie,
  updateSchema: UpdateEspecie,
};
