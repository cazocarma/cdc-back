import { HttpError } from '../middleware/error.js';

interface MssqlLikeError {
  number?: number;
  message?: string;
}

function asMssql(err: unknown): MssqlLikeError | null {
  if (err && typeof err === 'object' && 'number' in err) {
    return err as MssqlLikeError;
  }
  return null;
}

/**
 * Convierte errores de SQL Server a HttpError con semantica HTTP:
 *  - 2627 / 2601 → 409 conflict (UNIQUE / INDEX UNIQUE)
 *  - 547        → 409 fk_violation (FK en INSERT/UPDATE o REFERENCE en DELETE)
 *  - 515        → 422 not_null_violation
 *  - 8114 / 245 → 422 conversion_failed
 * Si no reconoce el error, lo re-tira tal cual para que el errorHandler lo loguee como 500.
 */
export function translateSqlError(err: unknown): never {
  const mssql = asMssql(err);
  const number = mssql?.number;

  if (number === 2627 || number === 2601) {
    throw new HttpError(409, 'conflict', 'Ya existe un registro con esos datos', {
      sqlNumber: number,
    });
  }
  if (number === 547) {
    throw new HttpError(409, 'fk_violation', 'Operacion bloqueada por integridad referencial', {
      sqlNumber: number,
    });
  }
  if (number === 515) {
    throw new HttpError(422, 'not_null_violation', 'Falta un campo obligatorio', {
      sqlNumber: number,
    });
  }
  if (number === 8114 || number === 245) {
    throw new HttpError(422, 'conversion_failed', 'Tipo de dato invalido', { sqlNumber: number });
  }

  throw err;
}
