import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { productosSpec } from './productos.schema.js';

export function buildProductosRouter(): Router {
  return buildCrudRouter(productosSpec);
}
