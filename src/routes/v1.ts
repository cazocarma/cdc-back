import { Router } from "express";
import { getAuthUser, getUnauthorizedHeaders } from "../lib/auth.js";
import { ok, error } from "../lib/http.js";
import { RESOURCE_CONFIG } from "../lib/resources.js";

import type { Request, Response } from "express";

const router = Router();

router.get("/api/v1", async (req: Request, res: Response) => {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return error(
      res,
      "Token invalido o expirado.",
      401,
      undefined,
      getUnauthorizedHeaders()
    );
  }

  ok(res, {
    message: "CDC API v1",
    resources: Object.keys(RESOURCE_CONFIG),
  });
});

export default router;
