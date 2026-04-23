import { getPool, mssql } from '../../infra/db.js';

export interface UsuarioUpsertInput {
  sub: string;
  usuario: string;
  nombre: string;
  email: string | null;
  primaryRole: string;
}

export interface UsuarioRow {
  Id: number;
  Sub: string;
  Usuario: string;
  Nombre: string;
  Email: string | null;
  PrimaryRole: string;
  Activo: boolean;
}

/**
 * MERGE cdc.Usuario por Sub (AUTH_STANDARD §8.bis).
 * Keycloak es fuente de verdad: cada login sobreescribe Usuario/Nombre/Email/PrimaryRole.
 * Activo queda bajo control local (permite suspension sin tocar el IdP).
 */
export async function upsertUsuario(input: UsuarioUpsertInput): Promise<UsuarioRow> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Sub', mssql.VarChar(64), input.sub)
    .input('Usuario', mssql.VarChar(50), input.usuario.slice(0, 50))
    .input('Nombre', mssql.NVarChar(100), input.nombre.slice(0, 100))
    .input('Email', mssql.NVarChar(150), input.email)
    .input('PrimaryRole', mssql.VarChar(50), input.primaryRole).query(`
      MERGE cdc.Usuario AS t
      USING (SELECT @Sub AS Sub, @Usuario AS Usuario, @Nombre AS Nombre, @Email AS Email, @PrimaryRole AS PrimaryRole) AS s
      ON t.Sub = s.Sub
      WHEN MATCHED THEN UPDATE SET
        Usuario     = s.Usuario,
        Nombre      = s.Nombre,
        Email       = s.Email,
        PrimaryRole = s.PrimaryRole,
        UpdatedAt   = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (Sub, Usuario, Nombre, Email, PrimaryRole)
        VALUES (s.Sub, s.Usuario, s.Nombre, s.Email, s.PrimaryRole)
      OUTPUT inserted.Id, inserted.Sub, inserted.Usuario, inserted.Nombre,
             inserted.Email, inserted.PrimaryRole, inserted.Activo;
    `);

  const row = result.recordset[0] as UsuarioRow;
  return row;
}
