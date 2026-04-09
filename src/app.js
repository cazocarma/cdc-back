const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const RedisStore = require("connect-redis").default;

const { config } = require("./config");
const { logger } = require("./logger");
const { redisClient, connectRedis } = require("./lib/redis-client");
const { authnMiddleware } = require("./middleware/authn.middleware");
const { csrfMiddleware } = require("./middleware/csrf.middleware");
const { readLimiter, writeLimiter } = require("./middleware/rate-limit.middleware");
const { authRouter } = require("./routes/auth.routes");
const { resourcesRouter } = require("./routes/resources.routes");

const app = express();

// Trust the platform router (single hop). Necesario para que express-session
// reconozca correctamente HTTPS via X-Forwarded-Proto cuando habilitemos TLS.
app.set("trust proxy", 1);

// ── Security headers ───────────────────────────────────────────────
// La CSP estricta la define el reverse proxy NGINX por vhost. helmet aqui
// solo aporta headers complementarios.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "no-referrer" },
  })
);

// ── Body parsing ───────────────────────────────────────────────────
// Limite agresivo: la API no recibe payloads grandes en BFF.
app.use(express.json({ limit: "256kb" }));

// ── Cookies + sesion server-side en Redis ──────────────────────────
app.use(cookieParser());

// El Redis client se conecta lazy en el primer require; aqui forzamos
// que exista antes de procesar requests.
connectRedis().catch((err) => logger.error({ err }, "redis.connect failed"));

const sessionStore = new RedisStore({
  client: redisClient,
  prefix: "cdc:sess:",
  ttl: config.session.ttlSeconds,
});

app.use(
  session({
    name: config.session.cookieName,
    store: sessionStore,
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.session.secure,
      sameSite: config.session.sameSite,
      maxAge: config.session.ttlSeconds * 1000,
      path: "/",
    },
  })
);

// ── Request logging (sin sid completo) ─────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info(
      {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - start,
        userId: req.session?.userId ?? null,
      },
      "request"
    );
  });
  next();
});

// ── Healthchecks publicos ──────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", service: "cdc-back" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "cdc-back" }));
app.get("/api/v1/health", (_req, res) => res.json({ status: "ok", service: "cdc-back", version: "v1" }));

// ── Auth (publico parcial: login/callback son GET sin authn previa) ─
app.use("/api/v1/auth", authRouter);

// ── API protegida ──────────────────────────────────────────────────
// Orden: authn → CSRF (state-changing) → rate limit → router de recursos.
app.use("/api/v1", authnMiddleware, csrfMiddleware, readLimiter, writeLimiter, resourcesRouter);

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
