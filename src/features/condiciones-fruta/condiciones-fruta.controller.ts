import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { condicionesFrutaSpec } from './condiciones-fruta.schema.js';

export function buildCondicionesFrutaRouter(): Router {
  return buildCrudRouter(condicionesFrutaSpec);
}
