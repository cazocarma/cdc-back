import { z } from 'zod';
import mssql from 'mssql';
import type { ColumnInput, CrudSpec } from '../../shared/crud.js';
import { col } from '../../shared/mappers.js';

export interface UsuarioRow {
  Id: number;
  Usuario: string;
  Nombre: string;
  Email: string | null;
  Activo: boolean;
}

export interface UsuarioDto {
  id: number;
  usuario: string;
  nombre: string;
  email: string;
  activo: boolean;
}

// El front NO expone sub/primaryRole en el mantenedor: solo se editan estos campos.
// Los usuarios nacen por login OIDC (upsertUsuario), no por POST a este endpoint.
export const UpdateUsuario = z
  .object({
    usuario: z.string().trim().min(1).max(50).optional(),
    nombre: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().email().max(150).optional().nullable(),
    activo: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Cuerpo vacio' });

type UpdateInput = z.infer<typeof UpdateUsuario>;

function rowToDto(r: UsuarioRow): UsuarioDto {
  return {
    id: Number(r.Id),
    usuario: r.Usuario,
    nombre: r.Nombre,
    email: r.Email ?? '',
    activo: r.Activo,
  };
}

function toUpdateColumns(input: unknown): ColumnInput[] {
  const i = input as UpdateInput;
  const cols: ColumnInput[] = [];
  if (i.usuario !== undefined) cols.push(col('Usuario', mssql.VarChar(50), i.usuario));
  if (i.nombre !== undefined) cols.push(col('Nombre', mssql.NVarChar(100), i.nombre));
  if (i.email !== undefined) cols.push(col('Email', mssql.NVarChar(150), i.email));
  if (i.activo !== undefined) cols.push(col('Activo', mssql.Bit, i.activo));
  // UpdatedAt queda bajo control del server — lo refrescamos en cada cambio.
  if (cols.length > 0) cols.push(col('UpdatedAt', mssql.DateTime2, new Date()));
  return cols;
}

export const usuariosSpec: CrudSpec<UsuarioDto, UsuarioRow> = {
  table: 'cdc.Usuario',
  searchColumns: ['Usuario', 'Nombre', 'Email'],
  rowToDto,
  // allowCreate=false: el createSchema/toCreateColumns no se ejecutan nunca,
  // pero los pasamos como placeholders validos para cumplir la interfaz.
  toCreateColumns: () => [],
  toUpdateColumns,
  createSchema: UpdateUsuario,
  updateSchema: UpdateUsuario,
  allowCreate: false,
};
