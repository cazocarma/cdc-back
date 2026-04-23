import { Router, type Request, type Response } from 'express';
import { getPool } from '../../infra/db.js';

const DB_PROBE_TIMEOUT_MS = 2_000;

async function probeDb(): Promise<'ok' | 'degraded'> {
  const timeout = new Promise<'degraded'>((resolve) =>
    setTimeout(() => resolve('degraded'), DB_PROBE_TIMEOUT_MS)
  );
  const query = (async () => {
    try {
      const pool = await getPool();
      await pool.request().query('SELECT 1 AS ok');
      return 'ok' as const;
    } catch {
      return 'degraded' as const;
    }
  })();
  return Promise.race([query, timeout]);
}

export function buildHealthRouter(): Router {
  const r = Router();

  // Liveness (cheap): responde si el proceso esta vivo y atendiendo.
  // Este es el endpoint del HEALTHCHECK de docker — NO debe depender de DB/Redis,
  // para que un hipo downstream no bloquee al orquestador.
  r.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // Readiness (rico): incluye probe no-bloqueante de la DB. Util para monitoreo
  // externo (Prometheus/Grafana) sin acoplar al healthcheck de docker.
  r.get('/api/health/ready', async (_req: Request, res: Response) => {
    const db = await probeDb();
    res.json({ status: 'ok', db });
  });

  return r;
}
