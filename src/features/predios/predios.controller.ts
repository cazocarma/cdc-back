import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { prediosSpec } from './predios.schema.js';

export function buildPrediosRouter(): Router {
  return buildCrudRouter(prediosSpec);
}
