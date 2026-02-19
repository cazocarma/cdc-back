import { NextRequest } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { error, ok } from "@/lib/http";
import { signAccessToken } from "@/lib/jwt";
import { consumeRateLimit } from "@/lib/rate-limit";
import { hashPassword, needsPasswordRehash, verifyPassword } from "@/lib/password";

const bodySchema = z.object({
  usuario: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(200),
});

const LOGIN_LIMIT_PER_IP = Number(process.env.LOGIN_RATE_LIMIT_PER_IP ?? 40);
const LOGIN_LIMIT_PER_USER_IP = Number(process.env.LOGIN_RATE_LIMIT_PER_USER_IP ?? 10);
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);
const MAX_RATE_LIMIT_KEY_PART_LENGTH = 120;

const DUMMY_HASH = hashPassword("cdc_dummy_password_for_timing");

function normalizeRateLimitKeyPart(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) {
    return "unknown";
  }
  return normalized.slice(0, MAX_RATE_LIMIT_KEY_PART_LENGTH);
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    return normalizeRateLimitKeyPart(first ?? "");
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return normalizeRateLimitKeyPart(realIp);
  }

  return "unknown";
}

function checkRateLimit(request: NextRequest, usuario: string) {
  const ip = getClientIp(request);
  const userKey = normalizeRateLimitKeyPart(usuario);

  const ipResult = consumeRateLimit(`login:ip:${ip}`, {
    limit: LOGIN_LIMIT_PER_IP,
    windowMs: LOGIN_WINDOW_MS,
  });
  if (!ipResult.allowed) {
    return ipResult;
  }

  return consumeRateLimit(`login:user:${ip}:${userKey}`, {
    limit: LOGIN_LIMIT_PER_USER_IP,
    windowMs: LOGIN_WINDOW_MS,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const rateLimit = checkRateLimit(request, body.usuario);
    if (!rateLimit.allowed) {
      return error(
        "Demasiados intentos de login. Intenta nuevamente en unos minutos.",
        429,
        { retryAfterSeconds: rateLimit.retryAfterSeconds },
        { "Retry-After": String(rateLimit.retryAfterSeconds) }
      );
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input("usuario", body.usuario)
      .query(
        `SELECT TOP (1) id_usuario, usuario, nombre, password_hash, activo
         FROM cdc.CDC_usuario
         WHERE usuario = @usuario`
      );

    const user = result.recordset[0] as
      | {
          id_usuario: number;
          usuario: string;
          nombre: string;
          password_hash: string | null;
          activo: boolean;
        }
      | undefined;

    const hashToVerify = user?.password_hash ?? DUMMY_HASH;
    const isValid = verifyPassword(body.password, hashToVerify);

    if (!user || !user.activo || !isValid) {
      return error(
        "Credenciales invalidas.",
        401,
        undefined,
        { "WWW-Authenticate": 'Bearer realm="cdc-api"' }
      );
    }

    if (user.password_hash && needsPasswordRehash(user.password_hash)) {
      const migratedHash = hashPassword(body.password);
      await pool
        .request()
        .input("id_usuario", user.id_usuario)
        .input("password_hash", migratedHash)
        .query(
          `UPDATE cdc.CDC_usuario
           SET password_hash = @password_hash, updated_at = SYSUTCDATETIME()
           WHERE id_usuario = @id_usuario`
        );
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
