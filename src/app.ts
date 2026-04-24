import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { logger } from './config/logger.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler, notFound } from './middleware/error.js';
import { buildSessionMiddleware } from './middleware/session.js';
import { protect } from './middleware/protect.js';
import { buildHealthRouter } from './features/health/health.controller.js';
import { buildAuthRouter } from './features/auth/auth.controller.js';
import { buildTemporadasRouter } from './features/temporadas/temporadas.controller.js';
import { buildExportadoresRouter } from './features/exportadores/exportadores.controller.js';
import { buildProductoresRouter } from './features/productores/productores.controller.js';
import { buildAgronomosRouter } from './features/agronomos/agronomos.controller.js';
import { buildEspeciesRouter } from './features/especies/especies.controller.js';
import { buildVariedadesRouter } from './features/variedades/variedades.controller.js';
import { buildCondicionesFrutaRouter } from './features/condiciones-fruta/condiciones-fruta.controller.js';
import { buildFundosRouter } from './features/fundos/fundos.controller.js';
import { buildPrediosRouter } from './features/predios/predios.controller.js';
import { buildFamiliasQuimicosRouter } from './features/familias-quimicos/familias-quimicos.controller.js';
import { buildIngredientesActivosRouter } from './features/ingredientes-activos/ingredientes-activos.controller.js';
import { buildTiposAguaRouter } from './features/tipos-agua/tipos-agua.controller.js';
import { buildPatogenosRouter } from './features/patogenos/patogenos.controller.js';
import { buildProductosRouter } from './features/productos/productos.controller.js';
import { buildProductosEspecieRouter } from './features/productos-especie/productos-especie.controller.js';
import { buildIngredientesProductoRouter } from './features/ingredientes-producto/ingredientes-producto.controller.js';
import { buildMercadosRouter } from './features/mercados/mercados.controller.js';
import { buildReglasRouter } from './features/reglas/reglas.controller.js';
import { buildCuadrosRouter } from './features/cuadros/cuadros.controller.js';
import { buildAplicacionesRouter } from './features/aplicaciones/aplicaciones.controller.js';
import { buildUsuariosRouter } from './features/usuarios/usuarios.controller.js';
import { buildAuditoriaRouter } from './features/auditoria/auditoria.controller.js';

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
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    })
  );

  // Health se monta ANTES de session/cookieParser/json: el healthcheck de docker
  // debe poder responder aunque Redis o la DB tengan un hipo. Si session estuviese
  // delante, un fallo de Redis haria 500 en /api/health y el container se marcaria
  // unhealthy en loop, impidiendo incluso que recuperemos el servicio.
  app.use(buildHealthRouter());

  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());
  app.use(buildSessionMiddleware());

  // Auth: gestiona su propio rate-limit y CSRF interno (csrfMiddleware en /logout).
  app.use('/api/v1/auth', buildAuthRouter());

  // Features de negocio: todas detras de [authn + csrf] via protect().
  app.use('/api/v1/temporadas', protect(buildTemporadasRouter()));
  app.use('/api/v1/exportadores', protect(buildExportadoresRouter()));
  app.use('/api/v1/productores', protect(buildProductoresRouter()));
  app.use('/api/v1/agronomos', protect(buildAgronomosRouter()));
  app.use('/api/v1/especies', protect(buildEspeciesRouter()));
  app.use('/api/v1/variedades', protect(buildVariedadesRouter()));
  app.use('/api/v1/condiciones-fruta', protect(buildCondicionesFrutaRouter()));
  app.use('/api/v1/fundos', protect(buildFundosRouter()));
  app.use('/api/v1/predios', protect(buildPrediosRouter()));
  app.use('/api/v1/familias-quimicos', protect(buildFamiliasQuimicosRouter()));
  app.use('/api/v1/ingredientes-activos', protect(buildIngredientesActivosRouter()));
  app.use('/api/v1/tipos-agua', protect(buildTiposAguaRouter()));
  app.use('/api/v1/patogenos', protect(buildPatogenosRouter()));
  app.use('/api/v1/productos', protect(buildProductosRouter()));
  app.use('/api/v1/productos-especie', protect(buildProductosEspecieRouter()));
  app.use('/api/v1/ingredientes-producto', protect(buildIngredientesProductoRouter()));
  app.use('/api/v1/mercados', protect(buildMercadosRouter()));
  app.use('/api/v1/reglas', protect(buildReglasRouter()));
  app.use('/api/v1/cuadros', protect(buildCuadrosRouter()));
  app.use('/api/v1/aplicaciones', protect(buildAplicacionesRouter()));
  app.use('/api/v1/usuarios', protect(buildUsuariosRouter()));
  app.use('/api/v1/auditoria', protect(buildAuditoriaRouter()));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
