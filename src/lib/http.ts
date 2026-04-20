import type { Response } from "express";

function shouldExposeDetails(status: number): boolean {
  if (status < 500) {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

export function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json(data);
}

export function error(
  res: Response,
  message: string,
  status = 400,
  details?: unknown,
  headers?: Record<string, string>
) {
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
  }

  res.status(status).json({
    message,
    details: shouldExposeDetails(status) ? details : undefined,
  });
}

export function parsePositiveInt(value: string | null | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}
