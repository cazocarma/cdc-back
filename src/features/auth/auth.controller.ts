import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { HttpError } from '../../middleware/error.js';
import { csrfMiddleware } from '../../middleware/csrf.js';
import {
  buildAuthorizationUrl,
  buildEndSessionUrl,
  generateCsrfToken,
  handleCallback,
  refreshIfNeeded,
} from './auth.service.js';
import { logAuditEvent } from './auth.audit.js';

const loginLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });
const callbackLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false });

// Solo permitimos returnTo relativo: abre ruta al caller sin habilitar open redirect.
const SAFE_RETURN_TO = /^\/[^\s]*$/;

// Errores que el front mapea en /login?error=<code> (login.component.ts:100-106)
type LoginErrorCode = 'forbidden_role' | 'callback_failed';

function mapCallbackError(err: unknown): LoginErrorCode {
  if (err instanceof HttpError) {
    if (err.code === 'forbidden_role' || err.status === 403) return 'forbidden_role';
  }
  return 'callback_failed';
}

function loginErrorRedirectUrl(code: LoginErrorCode): string {
  // POST_LOGOUT_REDIRECT_URI apunta al /login publico del SPA — reutilizamos ese host+prefix
  // para no depender del Host header (funciona igual bajo el router de platform).
  const base = new URL(env.OIDC_POST_LOGOUT_REDIRECT_URI);
  base.search = `?error=${code}`;
  return base.toString();
}

export function buildAuthRouter(): Router {
  const r = Router();

  // GET /api/v1/auth/login?returnTo=/ruta → 302 a Keycloak authorization_endpoint
  r.get('/login', loginLimiter, async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const raw = req.query.returnTo;
      const returnTo =
        typeof raw === 'string' && SAFE_RETURN_TO.test(raw) ? raw : '/';

      const url = await buildAuthorizationUrl(req, returnTo);

      // req.session.preAuth fue seteado por buildAuthorizationUrl. Forzamos save antes
      // de redirigir al IdP — si no, el Set-Cookie del sid podria no llegar al browser
      // antes de la navegacion a Keycloak y el callback no encontraria la preauth.
      req.session.save((err) => {
        if (err) return next(err);
        _res.redirect(302, url);
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/auth/callback?code&state → upsert + regenera sid + setea sesion + 302 a returnTo
  // En error: 302 a /login?error=<code> (el front no espera JSON aqui, esta en navegacion top-level).
  r.get('/callback', callbackLimiter, async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { tokenSet, usuario, returnTo, role } = await handleCallback(req);

      // Regenera el sid — defensa contra session fixation (AUTH_STANDARD §1).
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => (err ? reject(err) : resolve()));
      });

      const claims = tokenSet.claims();
      req.session.userId = usuario.Id;
      req.session.sub = claims.sub;
      req.session.usuario = usuario.Usuario;
      req.session.nombre = usuario.Nombre;
      req.session.email = usuario.Email;
      req.session.role = role;
      req.session.accessToken = tokenSet.access_token;
      req.session.refreshToken = tokenSet.refresh_token;
      req.session.idToken = tokenSet.id_token;
      req.session.accessTokenExpiresAt = tokenSet.expires_at
        ? tokenSet.expires_at * 1000
        : Date.now() + 300_000;
      req.session.csrfToken = generateCsrfToken();
      req.session.preAuth = undefined;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });

      await logAuditEvent(req, 'LOGIN');

      const target = returnTo && SAFE_RETURN_TO.test(returnTo) ? returnTo : '/';
      res.redirect(302, target);
    } catch (err) {
      const code = mapCallbackError(err);
      if (code === 'forbidden_role') {
        await logAuditEvent(req, 'FORBIDDEN_ROLE', (err as Error).message);
      } else {
        logger.warn({ err: (err as Error).message }, 'callback fallido');
      }
      res.redirect(302, loginErrorRedirectUrl(code));
    }
  });

  // GET /api/v1/auth/me → { user, csrfToken } o 401
  r.get('/me', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.session?.userId) {
        res.status(401).json({ error: { code: 'unauthorized', message: 'Sesion requerida' } });
        return;
      }

      try {
        await refreshIfNeeded(req);
      } catch (refreshErr) {
        await logAuditEvent(req, 'REFRESH_FAIL', (refreshErr as Error).message);
        await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
        res.clearCookie(env.SESSION_COOKIE_NAME, { path: '/' });
        res.status(401).json({ error: { code: 'session_expired', message: 'Sesion expirada' } });
        return;
      }

      res.json({
        user: {
          id: req.session.userId,
          sub: req.session.sub ?? '',
          usuario: req.session.usuario ?? '',
          nombre: req.session.nombre ?? '',
          email: req.session.email ?? null,
          role: req.session.role ?? '',
        },
        csrfToken: req.session.csrfToken ?? '',
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/v1/auth/logout → end_session en KC + destroy + clearCookie + 204
  r.post('/logout', csrfMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idToken = req.session?.idToken;
      await logAuditEvent(req, 'LOGOUT');

      if (idToken) {
        try {
          const url = await buildEndSessionUrl(idToken);
          // back-channel fire-and-forget — no bloqueamos al usuario esperando al IdP
          void fetch(url, { redirect: 'manual' }).catch((fetchErr) =>
            logger.warn({ err: (fetchErr as Error).message }, 'end_session_endpoint fallo')
          );
        } catch (buildErr) {
          logger.warn({ err: (buildErr as Error).message }, 'buildEndSessionUrl fallo');
        }
      }

      await new Promise<void>((resolve) => {
        req.session.destroy(() => resolve());
      });
      res.clearCookie(env.SESSION_COOKIE_NAME, { path: '/' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return r;
}
