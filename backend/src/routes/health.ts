import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "sobra-api",
    message: "API do Sobra funcionando.",
    timestamp: new Date().toISOString(),
  });
});

export default router;
