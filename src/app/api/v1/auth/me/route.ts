import { NextRequest } from "next/server";
import { error, ok } from "@/lib/http";
import { extractBearerToken, verifyAccessToken } from "@/lib/jwt";

export async function GET(request: NextRequest) {
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) {
    return error("Token no enviado.", 401);
  }

  try {
    const payload = await verifyAccessToken(token);
    return ok({
      user: {
        id_usuario: payload.sub,
        usuario: payload.usuario,
        nombre: payload.nombre,
      },
    });
  } catch {
    return error("Token invalido o expirado.", 401);
  }
}
