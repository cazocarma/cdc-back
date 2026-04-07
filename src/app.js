const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { config } = require("./config");
const { logger } = require("./logger");
const { requireJwtAuthn } = require("./middleware/authn.middleware");
const { readLimiter, writeLimiter } = require("./middleware/rate-limit.middleware");
const { authRouter } = require("./routes/auth.routes");
const { resourcesRouter } = require("./routes/resources.routes");

const app = express();

// ── Trust proxy ────────────────────────────────────────────────────
app.set("trust proxy", 1);

// ── Security headers ───────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS ───────────────────────────────────────────────────────────
app.use(cors({ origin: config.app.corsOrigin }));

// ── Body parsing ───────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));

// ── Request logging ────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info({ method: req.method, path: req.originalUrl, status: res.statusCode, ms: Date.now() - start }, "request");
  });
  next();
});

// ── Public endpoints ───────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "cdc-back" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "cdc-back" });
});

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", service: "cdc-back", version: "v1" });
});

app.use("/api/v1/auth", authRouter);

// ── Protected endpoints ────────────────────────────────────────────
app.use(requireJwtAuthn);
app.use(readLimiter);
app.use(writeLimiter);

app.use("/api/v1", resourcesRouter);

// ── Global error handler ───────────────────────────────────────────
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  logger.error({ err, method: req.method, path: req.path }, "unhandled error");

  if (status >= 500) {
    return res.status(500).json({ message: "Internal server error." });
  }

  res.status(status).json({ message: err.message || "Error desconocido." });
});

module.exports = { app };
