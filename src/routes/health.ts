import { Router } from "express";
import { ok } from "../lib/http.js";

const router = Router();

router.get("/api/health", (_req, res) => {
  ok(res, { status: "ok", service: "cdc-back" });
});

router.get("/api/v1/health", (_req, res) => {
  ok(res, { status: "ok", service: "cdc-back", version: "v1" });
});

export default router;
