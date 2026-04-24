import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { especiesSpec } from './especies.schema.js';

export function buildEspeciesRouter(): Router {
  return buildCrudRouter(especiesSpec);
}
