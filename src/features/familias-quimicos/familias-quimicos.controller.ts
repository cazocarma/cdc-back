import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { familiasQuimicosSpec } from './familias-quimicos.schema.js';

export function buildFamiliasQuimicosRouter(): Router {
  return buildCrudRouter(familiasQuimicosSpec);
}
