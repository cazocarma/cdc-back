import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { productoresSpec } from './productores.schema.js';

export function buildProductoresRouter(): Router {
  return buildCrudRouter(productoresSpec);
}
