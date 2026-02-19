import { NextResponse } from "next/server";

function buildHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  return headers;
}

function shouldExposeDetails(status: number): boolean {
  if (status < 500) {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: buildHeaders() });
}

export function error(message: string, status = 400, details?: unknown, headers?: HeadersInit) {
  return NextResponse.json(
    { message, details: shouldExposeDetails(status) ? details : undefined },
    { status, headers: buildHeaders(headers) }
  );
}

export function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}
