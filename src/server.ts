import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { buildApp } from './app.js';
import { getPool, closePool } from './infra/db.js';
import { getRedis, closeRedis } from './infra/redis.js';
import { warmUpOidc } from './features/auth/auth.service.js';

async function main(): Promise<void> {
  // Warm-up DB: no fatal si falla (el pool reintenta en cada request)
  try {
    await getPool();
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      'DB no disponible al arrancar — el servicio seguira intentando'
    );
  }

  // Warm-up Redis: fatal. Sin Redis no hay sesion, y sin sesion no hay BFF.
  try {
    getRedis();
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Redis no disponible');
    process.exit(1);
  }

  const app = buildApp();
  const server = app.listen(env.PORT, env.HOSTNAME, () => {
    logger.info({ port: env.PORT, host: env.HOSTNAME, env: env.NODE_ENV }, 'cdc-back escuchando');
  });

  // Pre-warm del issuer OIDC: evita que el primer login pague el costo de
  // discovery (que puede exceder 3.5s en cold-start de Keycloak). No bloqueante
  // — si falla, el endpoint /auth/login reintentara al recibir el primer request.
  void warmUpOidc();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'apagando...');
    server.close();
    await Promise.allSettled([closePool(), closeRedis()]);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'unhandledRejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException');
    process.exit(1);
  });
}

void main();
