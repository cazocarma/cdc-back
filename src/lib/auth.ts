import { NextRequest } from "next/server";
import { extractBearerToken, verifyAccessToken } from "@/lib/jwt";

export type AuthUser = {
  idUsuario: number;
  usuario: string;
  nombre: string;
};

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
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

    return {
      idUsuario,
      usuario: payload.usuario,
      nombre: payload.nombre,
    };
  } catch {
    return null;
  }
}
