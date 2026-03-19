import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, verifyAccessToken } from "@/lib/jwt";

const PUBLIC_PATHS = new Set(["/api/v1/auth/login", "/api/v1/health", "/api/health"]);
const UNAUTHORIZED_HEADERS = {
  "WWW-Authenticate": 'Bearer realm="cdc-api", error="invalid_token"',
};

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return applySecurityHeaders(NextResponse.next());
  }

  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) {
    return applySecurityHeaders(
      NextResponse.json(
        { message: "Token invalido o expirado." },
        { status: 401, headers: UNAUTHORIZED_HEADERS }
      )
    );
  }

  try {
    await verifyAccessToken(token);
    return applySecurityHeaders(NextResponse.next());
  } catch {
    return applySecurityHeaders(
      NextResponse.json(
        { message: "Token invalido o expirado." },
        { status: 401, headers: UNAUTHORIZED_HEADERS }
      )
    );
  }
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
