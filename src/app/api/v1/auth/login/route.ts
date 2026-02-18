import { NextRequest } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { error, ok } from "@/lib/http";
import { signAccessToken } from "@/lib/jwt";
import { verifyPassword } from "@/lib/password";

const bodySchema = z.object({
  usuario: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const pool = await getPool();

    const result = await pool
      .request()
      .input("usuario", body.usuario)
      .query(
        `SELECT TOP (1) id_usuario, usuario, nombre, password_hash, activo
         FROM cdc.CDC_usuario
         WHERE usuario = @usuario`
      );

    const user = result.recordset[0];
    if (!user || !user.activo) {
      return error("Credenciales invalidas.", 401);
    }

    const isValid = verifyPassword(body.password, user.password_hash ?? "");
    if (!isValid) {
      return error("Credenciales invalidas.", 401);
    }

    const token = await signAccessToken({
      sub: String(user.id_usuario),
      usuario: user.usuario,
      nombre: user.nombre,
    });

    return ok(
      {
        accessToken: token,
        tokenType: "Bearer",
        user: {
          id_usuario: user.id_usuario,
          usuario: user.usuario,
          nombre: user.nombre,
        },
      },
      200
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return error("Payload invalido.", 422, e.flatten());
    }
    return error("Error en login.", 500, e instanceof Error ? e.message : e);
  }
}
