import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const TOKEN_ISSUER = "greenvic-cdc";
const TOKEN_AUDIENCE = "greenvic-cdc-api";
const MIN_SECRET_LENGTH = 32;

type JwtPayload = {
  sub: string;
  usuario: string;
  nombre: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
};

export type AuthClaims = {
  sub: string;
  usuario: string;
  nombre: string;
};

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable.");
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must contain at least ${MIN_SECRET_LENGTH} characters.`);
  }
  return secret;
}

function encodeBase64Url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function decodeBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function parseExpiresInToSeconds(value: string): number {
  const input = value.trim().toLowerCase();
  const match = input.match(/^(\d+)([smhd])?$/);
  if (!match) {
    throw new Error("Invalid JWT_EXPIRES_IN format.");
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? "s";
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid JWT_EXPIRES_IN value.");
  }

  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * 60 * 60 * 24;
    default:
      throw new Error("Invalid JWT_EXPIRES_IN unit.");
  }
}

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function safeEqualString(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function validatePayload(payload: JwtPayload, nowSeconds: number): AuthClaims {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid token payload.");
  }
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid token subject.");
  }
  if (typeof payload.usuario !== "string" || typeof payload.nombre !== "string") {
    throw new Error("Invalid token claims.");
  }
  if (payload.iss !== TOKEN_ISSUER) {
    throw new Error("Invalid token issuer.");
  }
  if (payload.aud !== TOKEN_AUDIENCE) {
    throw new Error("Invalid token audience.");
  }
  if (!Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) {
    throw new Error("Invalid token timestamps.");
  }
  if (typeof payload.jti !== "string" || payload.jti.trim().length === 0) {
    throw new Error("Invalid token identifier.");
  }
  if (payload.exp <= payload.iat) {
    throw new Error("Invalid token lifetime.");
  }

  const clockToleranceSeconds = 5;
  if (payload.iat - clockToleranceSeconds > nowSeconds) {
    throw new Error("Token used before issue time.");
  }
  if (payload.exp + clockToleranceSeconds < nowSeconds) {
    throw new Error("Expired token.");
  }

  return {
    sub: payload.sub,
    usuario: payload.usuario,
    nombre: payload.nombre,
  };
}

export async function signAccessToken(claims: AuthClaims): Promise<string> {
  const secret = getSecret();
  const expiresInRaw = process.env.JWT_EXPIRES_IN ?? "8h";
  const expiresInSeconds = parseExpiresInToSeconds(expiresInRaw);
  const nowSeconds = Math.floor(Date.now() / 1000);

  const header = { alg: "HS256", typ: "JWT" };
  const payload: JwtPayload = {
    sub: claims.sub,
    usuario: claims.usuario,
    nombre: claims.nombre,
    iss: TOKEN_ISSUER,
    aud: TOKEN_AUDIENCE,
    iat: nowSeconds,
    exp: nowSeconds + expiresInSeconds,
    jti: randomUUID(),
  };

  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(dataToSign, secret);

  return `${dataToSign}.${signature}`;
}

export async function verifyAccessToken(token: string): Promise<AuthClaims> {
  const secret = getSecret();
  const chunks = token.trim().split(".");
  if (chunks.length !== 3) {
    throw new Error("Malformed token.");
  }

  const [encodedHeader, encodedPayload, providedSignature] = chunks;
  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`, secret);
  if (!safeEqualString(providedSignature, expectedSignature)) {
    throw new Error("Invalid token signature.");
  }

  const header = JSON.parse(decodeBase64Url(encodedHeader)) as { alg?: string; typ?: string };
  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new Error("Invalid token header.");
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload)) as JwtPayload;
  return validatePayload(payload, Math.floor(Date.now() / 1000));
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
