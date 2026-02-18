import { ok } from "@/lib/http";

export async function GET() {
  return ok({ status: "ok", service: "cdc-back", version: "v1" });
}
