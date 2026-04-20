import "dotenv/config";
import express from "express";
import { securityHeaders } from "./middleware/security-headers.js";
import { authenticate } from "./middleware/authenticate.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import v1Routes from "./routes/v1.js";
import resourceRoutes from "./routes/resources.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const HOSTNAME = process.env.HOSTNAME ?? "0.0.0.0";

// Disable X-Powered-By header
app.disable("x-powered-by");

// Parse JSON bodies with size limit
app.use(express.json({ limit: "1mb" }));

// Security headers on all responses
app.use(securityHeaders);

// Authentication middleware for /api/v1/* routes
app.use("/api/v1", authenticate);

// Routes (order matters: specific before dynamic)
app.use(healthRoutes);
app.use(authRoutes);
app.use(v1Routes);
app.use(resourceRoutes);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ message: "Ruta no encontrada." });
});

app.listen(PORT, HOSTNAME, () => {
  console.log(`cdc-back running on http://${HOSTNAME}:${PORT}`);
});

export default app;
