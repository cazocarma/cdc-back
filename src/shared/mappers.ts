import mssql from 'mssql';
import { z } from 'zod';
import type { ColumnInput } from './crud.js';

export function isoOrNull(v: Date | null | undefined): string | null {
  return v instanceof Date ? v.toISOString() : null;
}

export function isoStrict(v: Date | null | undefined): string {
  if (!(v instanceof Date)) throw new Error('Fecha esperada no nula');
  return v.toISOString();
}

export function toDateOrNull(v: string | null | undefined): Date | null {
  return v ? new Date(v) : null;
}

export function toNumber(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  if (!Number.isFinite(n)) throw new Error(`Valor numerico invalido: ${String(v)}`);
  return n;
}

export function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

/** Acepta cualquier string parseable por Date.parse (incluye "YYYY-MM-DD" e ISO 8601 completo). */
export const isoString = z
  .string()
  .trim()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Fecha invalida' });

export const col = (
  name: string,
  type: mssql.ISqlType | (() => mssql.ISqlType),
  value: unknown
): ColumnInput => ({ name, type, value });
