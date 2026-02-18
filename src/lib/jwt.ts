import { jwtVerify, SignJWT } from "jose";

const encoder = new TextEncoder();
const TOKEN_ISSUER = "greenvic-cdc";
const TOKEN_AUDIENCE = "greenvic-cdc-api";

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
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
  return payload;
}

export function extractBearerToken(headerValue: string | null): string | null {
  if (!headerValue) {
    return null;
  }
  const [scheme, token] = headerValue.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }
  return token.trim();
}
