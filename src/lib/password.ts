import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;

function normalizePassword(input: string): string {
  return input.trim();
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function safeCompare(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function hashPassword(inputPassword: string): string {
  const normalized = normalizePassword(inputPassword);
  if (normalized.length < 8) {
    throw new Error("La contrasena debe tener al menos 8 caracteres.");
  }

  const salt = randomBytes(SCRYPT_SALT_BYTES).toString("hex");
  const hash = scryptSync(normalized, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyScryptPassword(inputPassword: string, storedHash: string): boolean {
  const chunks = storedHash.split(":");
  if (chunks.length !== 3) {
    return false;
  }

  const [, salt, expectedHash] = chunks;
  if (!salt || !expectedHash) {
    return false;
  }

  const normalized = normalizePassword(inputPassword);
  const actualHash = scryptSync(normalized, salt, SCRYPT_KEYLEN).toString("hex");
  return safeCompare(expectedHash, actualHash);
}

export function needsPasswordRehash(storedHash: string): boolean {
  return !storedHash.startsWith("scrypt:");
}

export function verifyPassword(inputPassword: string, storedHash: string): boolean {
  if (!storedHash) {
    return false;
  }

  if (storedHash.startsWith("scrypt:")) {
    return verifyScryptPassword(inputPassword, storedHash);
  }

  if (storedHash.startsWith("sha256:")) {
    return safeCompare(
      storedHash.slice("sha256:".length),
      sha256(normalizePassword(inputPassword))
    );
  }

  return safeCompare(storedHash, normalizePassword(inputPassword));
}
