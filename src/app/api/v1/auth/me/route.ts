import { NextRequest } from "next/server";
import { getAuthUser, getUnauthorizedHeaders } from "@/lib/auth";
import { error, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return error(
      "Token invalido o expirado.",
      401,
      undefined,
      getUnauthorizedHeaders()
    );
  }

  return ok({
    user: {
      id_usuario: authUser.idUsuario,
      usuario: authUser.usuario,
      nombre: authUser.nombre,
      email: authUser.email,
    },
  });
}
