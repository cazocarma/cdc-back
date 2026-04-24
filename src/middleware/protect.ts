import { Router } from 'express';
import { authnMiddleware } from './authn.js';
import { csrfMiddleware } from './csrf.js';

/**
 * Monta un router de feature detras de [authn, csrf].
 * Uso: app.use('/api/v1/patogenos', protect(buildPatogenosRouter()))
 */
export function protect(inner: Router): Router {
  const r = Router({ mergeParams: true });
  r.use(authnMiddleware);
  r.use(csrfMiddleware);
  r.use(inner);
  return r;
}
