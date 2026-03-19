import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { extractBearerToken, verifyAccessToken } from "@/lib/jwt";

export type AuthUser = {
  idUsuario: number;
  usuario: string;
  nombre: string;
  email: string | null;
};

export function getUnauthorizedHeaders(): HeadersInit {
  return {
    "WWW-Authenticate": 'Bearer realm="cdc-api", error="invalid_token"',
  };
}

type TokenClaims = {
  idUsuario: number;
};

async function getTokenClaims(request: NextRequest): Promise<TokenClaims | null> {
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(token);
    const idUsuario = Number(payload.sub);

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      return null;
    }

    return { idUsuario };
  } catch {
    return null;
  }
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const claims = await getTokenClaims(request);
  if (!claims) {
    return null;
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id_usuario", claims.idUsuario)
      .query(
        `SELECT TOP (1) id_usuario, usuario, nombre, email, activo
         FROM cdc.CDC_usuario
         WHERE id_usuario = @id_usuario`
      );

    const user = result.recordset[0] as
      | {
          id_usuario: number;
          usuario: string;
          nombre: string;
          email: string | null;
          activo: boolean;
        }
      | undefined;

    if (!user || !user.activo) {
      return null;
    }

    return {
      idUsuario: user.id_usuario,
      usuario: user.usuario,
      nombre: user.nombre,
      email: user.email ?? null,
    };
  } catch {
    return null;
  }
}
