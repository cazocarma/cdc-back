import { z } from 'zod';
import type { CrudSpec } from '../../shared/crud.js';
import { isoStrict } from '../../shared/mappers.js';

export interface AuditoriaRow {
  Id: number;
  UsuarioId: number | null;
  FechaEvento: Date;
  Operacion: string;
  Tabla: string | null;
  Pk: string | null;
  Detalle: string | null;
  Origen: string;
}

export interface AuditoriaDto {
  id: number;
  usuarioId: number;
  fechaEvento: string;
  operacion: string;
  tabla: string;
  pk: string;
  detalle: string;
  // beforeJson/afterJson no existen en la tabla actual (ver docs/24042026 §7).
  // Devolvemos string vacio para cumplir el contrato del front sin tocar schema.
  beforeJson: string;
  afterJson: string;
  origen: string;
}

// Read-only: los schemas de create/update se exponen para cumplir la interfaz del factory
// pero el factory bloquea POST/PUT/DELETE con 405. No se llegan a usar.
const Noop = z.object({}).strict();

function rowToDto(r: AuditoriaRow): AuditoriaDto {
  return {
    id: Number(r.Id),
    usuarioId: r.UsuarioId !== null ? Number(r.UsuarioId) : 0,
    fechaEvento: isoStrict(r.FechaEvento),
    operacion: r.Operacion,
    tabla: r.Tabla ?? '',
    pk: r.Pk ?? '',
    detalle: r.Detalle ?? '',
    beforeJson: '',
    afterJson: '',
    origen: r.Origen,
  };
}

export const auditoriaSpec: CrudSpec<AuditoriaDto, AuditoriaRow> = {
  table: 'cdc.Auditoria',
  searchColumns: ['Operacion', 'Tabla', 'Detalle'],
  defaultOrderBy: '[FechaEvento] DESC, [Id] DESC',
  rowToDto,
  toCreateColumns: () => [],
  toUpdateColumns: () => [],
  createSchema: Noop,
  updateSchema: Noop,
  allowCreate: false,
  allowUpdate: false,
  allowDelete: false,
};
