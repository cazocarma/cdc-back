import { ok } from "@/lib/http";
import { RESOURCE_CONFIG } from "@/lib/resources";

export async function GET() {
  return ok({
    message: "CDC API v1",
    resources: Object.keys(RESOURCE_CONFIG),
  });
}
