import { Router, type Request, type Response } from 'express';
import { getPool } from '../../infra/db.js';

export function buildHealthRouter(): Router {
  const r = Router();

  r.get('/api/health', async (_req: Request, res: Response) => {
    let db: 'ok' | 'degraded' = 'ok';
    try {
      const pool = await getPool();
      await pool.request().query('SELECT 1 AS ok');
    } catch {
      db = 'degraded';
    }
    res.json({ status: 'ok', db });
  });

  return r;
}
