import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { productosEspecieSpec } from './productos-especie.schema.js';

export function buildProductosEspecieRouter(): Router {
  return buildCrudRouter(productosEspecieSpec);
}
