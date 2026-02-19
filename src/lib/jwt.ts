import { randomUUID } from "node:crypto";
import { JWTPayload, jwtVerify, SignJWT } from "jose";

const encoder = new TextEncoder();
const TOKEN_ISSUER = "greenvic-cdc";
const TOKEN_AUDIENCE = "greenvic-cdc-api";
const MIN_SECRET_LENGTH = 32;

export type AuthClaims = {
  sub: string;
  usuario: string;
  nombre: string;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable.");
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must contain at least ${MIN_SECRET_LENGTH} characters.`);
  }
  return encoder.encode(secret);
}

export async function signAccessToken(claims: AuthClaims): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "8h";
  return new SignJWT({ usuario: claims.usuario, nombre: claims.nombre })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

function validatePayload(payload: JWTPayload): AuthClaims {
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid token subject.");
  }
  if (typeof payload.usuario !== "string" || typeof payload.nombre !== "string") {
    throw new Error("Invalid token claims.");
  }

  return {
    sub: payload.sub,
    usuario: payload.usuario,
    nombre: payload.nombre,
  };
}

export async function verifyAccessToken(token: string): Promise<AuthClaims> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ["HS256"],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    clockTolerance: 5,
  });
  return validatePayload(payload);
}

export function extractBearerToken(headerValue: string | null): string | null {
  if (!headerValue) {
    return null;
  }
  const [scheme, token] = headerValue.trim().split(/\s+/);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }
  return token.trim();
}
