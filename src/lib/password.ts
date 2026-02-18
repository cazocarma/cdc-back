import { createHash, timingSafeEqual } from "node:crypto";

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function verifyPassword(inputPassword: string, storedHash: string): boolean {
  if (!storedHash) {
    return false;
  }

  if (storedHash.startsWith("sha256:")) {
    const expected = Buffer.from(storedHash.slice("sha256:".length), "utf8");
    const actual = Buffer.from(sha256(inputPassword), "utf8");
    if (expected.length !== actual.length) {
      return false;
    }
    return timingSafeEqual(expected, actual);
  }

  const expected = Buffer.from(storedHash, "utf8");
  const actual = Buffer.from(inputPassword, "utf8");
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}
