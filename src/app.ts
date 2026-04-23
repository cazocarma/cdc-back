import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { logger } from './config/logger.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler, notFound } from './middleware/error.js';
import { buildSessionMiddleware } from './middleware/session.js';
import { buildHealthRouter } from './features/health/health.controller.js';
import { buildAuthRouter } from './features/auth/auth.controller.js';

export function buildApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      contentSecurityPolicy: false, // CSP la fija el router per vhost
    })
  );

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ requestId: (req as express.Request).requestId }),
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    })
  );

  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());
  app.use(buildSessionMiddleware());

  // Publico: health + auth (auth gestiona su propio rate-limit y CSRF interno)
  app.use(buildHealthRouter());
  app.use('/api/v1/auth', buildAuthRouter());

  // Las features de negocio (temporadas, cuadros, aplicaciones, ...) se montan aqui
  // detras de authnMiddleware + csrfMiddleware cuando se agreguen.

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
