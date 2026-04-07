const express = require("express");
const jwt = require("jsonwebtoken");
const { createHash, timingSafeEqual } = require("node:crypto");
const { z } = require("zod");
const { getPool } = require("../db");
const { config } = require("../config");
const { validate } = require("../middleware/validate.middleware");
const { loginLimiter } = require("../middleware/rate-limit.middleware");
const { extractBearerToken } = require("../middleware/authn.middleware");
const { logger } = require("../logger");

const router = express.Router();

// ── Password verification ──────────────────────────────────────────
function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function verifyPassword(inputPassword, storedHash) {
  if (!storedHash) return false;

  if (storedHash.startsWith("sha256:")) {
    const expected = Buffer.from(storedHash.slice("sha256:".length), "utf8");
    const actual = Buffer.from(sha256(inputPassword), "utf8");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  }

  const expected = Buffer.from(storedHash, "utf8");
  const actual = Buffer.from(inputPassword, "utf8");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

// ── Schemas ────────────────────────────────────────────────────────
const loginBody = z.object({
  usuario: z.string().min(1),
  password: z.string().min(1),
});

// ── POST /login ────────────────────────────────────────────────────
router.post(
  "/login",
  loginLimiter,
  validate({ body: loginBody }),
  async (req, res, next) => {
    try {
      const { usuario, password } = req.body;
      const pool = await getPool();

      const result = await pool
        .request()
        .input("usuario", usuario)
        .query(
          `SELECT TOP (1) Id, Usuario, Nombre, PasswordHash, Activo
           FROM cdc.Usuario
           WHERE Usuario = @usuario`
        );

      const user = result.recordset[0];
      if (!user || !user.Activo) {
        return res.status(401).json({ message: "Credenciales invalidas." });
      }

      if (!verifyPassword(password, user.PasswordHash ?? "")) {
        return res.status(401).json({ message: "Credenciales invalidas." });
      }

      const token = jwt.sign(
        { usuario: user.Usuario, nombre: user.Nombre },
        config.authn.jwtSecret,
        {
          algorithm: "HS256",
          subject: String(user.Id),
          issuer: "greenvic-cdc",
          audience: "greenvic-cdc-api",
          expiresIn: config.authn.jwtExpiresIn,
        }
      );

      res.json({
        accessToken: token,
        tokenType: "Bearer",
        user: {
          id: user.Id,
          usuario: user.Usuario,
          nombre: user.Nombre,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /me ────────────────────────────────────────────────────────
router.get("/me", (req, res) => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ message: "Token no enviado." });
  }

  try {
    const payload = jwt.verify(token, config.authn.jwtSecret, {
      algorithms: ["HS256"],
      issuer: "greenvic-cdc",
      audience: "greenvic-cdc-api",
    });

    res.json({
      user: {
        id: payload.sub,
        usuario: payload.usuario,
        nombre: payload.nombre,
      },
    });
  } catch {
    res.status(401).json({ message: "Token invalido o expirado." });
  }
});

module.exports = { authRouter: router };
