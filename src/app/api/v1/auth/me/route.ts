import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { error, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return error("Token invalido o expirado.", 401);
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id_usuario", authUser.idUsuario)
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
      return error("Token invalido o expirado.", 401);
    }

    return ok({
      user: {
        id_usuario: user.id_usuario,
        usuario: user.usuario,
        nombre: user.nombre,
        email: user.email,
      },
    });
  } catch {
    return error("Token invalido o expirado.", 401);
  }
}
