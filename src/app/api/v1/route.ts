import { NextRequest } from "next/server";
import { getAuthUser, getUnauthorizedHeaders } from "@/lib/auth";
import { error, ok } from "@/lib/http";
import { RESOURCE_CONFIG } from "@/lib/resources";

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return error(
      "Token invalido o expirado.",
      401,
      undefined,
      getUnauthorizedHeaders()
    );
  }

  return ok({
    message: "CDC API v1",
    resources: Object.keys(RESOURCE_CONFIG),
  });
}
