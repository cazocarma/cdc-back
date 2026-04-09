// ── Auth routes (OIDC BFF) ─────────────────────────────────────────
// Patron Backend-for-Frontend (BFF). Cuatro endpoints estandar:
//
//   GET  /api/v1/auth/login     → 302 a Keycloak (state+nonce+pkce)
//   GET  /api/v1/auth/callback  → exchange code → sesion en Redis
//   GET  /api/v1/auth/me        → { user, csrfToken }
//   POST /api/v1/auth/logout    → destroy + end_session
//
// Tokens OIDC viven SOLO en la sesion server-side (Redis). El browser
// solo ve la cookie opaca cdc.sid (HttpOnly + SameSite=Strict).

const express = require("express");
const { generators } = require("openid-client");
const { z } = require("zod");

const { config } = require("../config");
const { getPool, sql } = require("../db");
const { getClient } = require("../lib/oidc-client");
const { newCsrfToken } = require("../lib/csrf");
const { audit } = require("../lib/audit");
const { logger } = require("../logger");
const { csrfMiddleware } = require("../middleware/csrf.middleware");
const { loginLimiter } = require("../middleware/rate-limit.middleware");

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────
function regenerate(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

async function upsertUsuario({ sub, username, nombre, email, role }) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("sub", sql.VarChar(64), sub)
    .input("usuario", sql.VarChar(50), username)
    .input("nombre", sql.NVarChar(100), nombre)
    .input("email", sql.NVarChar(150), email)
    .input("role", sql.VarChar(50), role)
    .query(`
      MERGE cdc.Usuario AS t
      USING (SELECT @sub AS Sub, @usuario AS Usuario, @nombre AS Nombre, @email AS Email, @role AS PrimaryRole) AS s
      ON t.Sub = s.Sub
      WHEN MATCHED THEN
        UPDATE SET
          Usuario     = s.Usuario,
          Nombre      = s.Nombre,
          Email       = s.Email,
          PrimaryRole = s.PrimaryRole,
          UpdatedAt   = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (Sub, Usuario, Nombre, Email, PrimaryRole, Activo)
        VALUES (s.Sub, s.Usuario, s.Nombre, s.Email, s.PrimaryRole, 1)
      OUTPUT inserted.Id, inserted.Activo;
    `);
  return result.recordset[0];
}

function pickPrimaryRole(claims, requiredRole) {
  const realmRoles = claims?.realm_access?.roles;
  if (Array.isArray(realmRoles) && realmRoles.includes(requiredRole)) {
    return requiredRole;
  }
  return null;
}

// ── GET /api/v1/auth/login ─────────────────────────────────────────
router.get("/login", async (req, res, next) => {
  try {
    const client = await getClient();

    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    req.session.oauth = {
      state,
      nonce,
      codeVerifier,
      returnTo: typeof req.query.returnTo === "string" ? req.query.returnTo : null,
    };
    await saveSession(req);

    const url = client.authorizationUrl({
      scope: config.oidc.scopes,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    res.redirect(302, url);
  } catch (err) {
    logger.error({ err }, "auth.login failed");
    next(err);
  }
});

// ── GET /api/v1/auth/callback ──────────────────────────────────────
router.get("/callback", loginLimiter, async (req, res, next) => {
  try {
    const oauth = req.session?.oauth;
    if (!oauth || !oauth.state || !oauth.codeVerifier) {
      return res.status(400).json({ message: "Sesion preauth invalida" });
    }

    const client = await getClient();
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(
      config.oidc.redirectUri,
      params,
      { state: oauth.state, nonce: oauth.nonce, code_verifier: oauth.codeVerifier }
    );

    const claims = tokenSet.claims();
    const sub = claims.sub;
    const username = claims.preferred_username || claims.email || sub;
    const nombre = claims.name || username;
    const email = claims.email || null;

    const role = pickPrimaryRole(claims, config.oidc.requiredRole);
    if (!role) {
      audit({ operacion: "FORBIDDEN_ROLE", detalle: `sub=${sub} sin ${config.oidc.requiredRole}` });
      return res.status(403).json({ message: "Usuario sin acceso a CDC" });
    }

    const user = await upsertUsuario({ sub, username, nombre, email, role });
    if (!user.Activo) {
      audit({ usuarioId: user.Id, operacion: "FORBIDDEN_ROLE", detalle: "Activo=0" });
      return res.status(403).json({ message: "Usuario inactivo" });
    }

    const returnTo = oauth.returnTo;

    // Rota el sid: nuevo cookie, vacia la sesion preauth.
    await regenerate(req);
    req.session.userId = user.Id;
    req.session.sub = sub;
    req.session.usuario = username;
    req.session.nombre = nombre;
    req.session.email = email;
    req.session.role = role;
    req.session.accessToken = tokenSet.access_token;
    req.session.refreshToken = tokenSet.refresh_token;
    req.session.idToken = tokenSet.id_token;
    req.session.accessTokenExpiresAt = (tokenSet.expires_at ?? Math.floor(Date.now() / 1000) + 300) * 1000;
    req.session.csrfToken = newCsrfToken();
    await saveSession(req);

    audit({
      usuarioId: user.Id,
      operacion: "LOGIN",
      detalle: `Login OIDC sub=${sub.slice(0, 8)} role=${role}`,
    });

    const safeReturnTo = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
    res.redirect(302, safeReturnTo);
  } catch (err) {
    logger.warn({ err: err.message }, "auth.callback failed");
    res.status(401).json({ message: "Callback OIDC invalido" });
  }
});

// ── GET /api/v1/auth/me ────────────────────────────────────────────
router.get("/me", (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "No autenticado" });
  }
  res.json({
    user: {
      id: req.session.userId,
      sub: req.session.sub,
      usuario: req.session.usuario,
      nombre: req.session.nombre,
      email: req.session.email,
      role: req.session.role,
    },
    csrfToken: req.session.csrfToken,
  });
});

// ── POST /api/v1/auth/logout ───────────────────────────────────────
router.post("/logout", csrfMiddleware, async (req, res) => {
  const userId = req.session?.userId;
  const idToken = req.session?.idToken;

  try {
    if (idToken) {
      const client = await getClient();
      const url = client.endSessionUrl({
        id_token_hint: idToken,
        post_logout_redirect_uri: config.oidc.postLogoutRedirectUri,
      });
      // Llamada back-channel para invalidar la sesion en Keycloak. No
      // seguimos el redirect: solo nos importa que Keycloak procese.
      try {
        await fetch(url, { redirect: "manual" });
      } catch (err) {
        logger.warn({ err: err.message }, "auth.logout end_session call failed");
      }
    }

    if (req.session) {
      await destroySession(req);
    }
  } catch (err) {
    logger.error({ err }, "auth.logout error");
  } finally {
    res.clearCookie(config.session.cookieName, { path: "/" });
    if (userId) {
      audit({ usuarioId: userId, operacion: "LOGOUT" });
    }
    res.status(204).end();
  }
});

module.exports = { authRouter: router };
