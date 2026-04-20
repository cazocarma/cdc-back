import type { Request, Response, NextFunction } from "express";
import { extractBearerToken, verifyAccessToken } from "../lib/jwt.js";

const PUBLIC_PATHS = new Set(["/api/v1/auth/login", "/api/v1/health", "/api/health"]);
const UNAUTHORIZED_HEADERS: Record<string, string> = {
  "WWW-Authenticate": 'Bearer realm="cdc-api", error="invalid_token"',
};

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_PATHS.has(req.path)) {
    return next();
  }

  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    for (const [key, value] of Object.entries(UNAUTHORIZED_HEADERS)) {
      res.setHeader(key, value);
    }
    res.status(401).json({ message: "Token invalido o expirado." });
    return;
  }

  try {
    await verifyAccessToken(token);
    next();
  } catch {
    for (const [key, value] of Object.entries(UNAUTHORIZED_HEADERS)) {
      res.setHeader(key, value);
    }
    res.status(401).json({ message: "Token invalido o expirado." });
  }
}
