import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, verifyAccessToken } from "@/lib/jwt";

const PUBLIC_PATHS = new Set(["/api/v1", "/api/v1/auth/login", "/api/v1/health", "/api/health"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await verifyAccessToken(token);
    return NextResponse.next();
  } catch {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
