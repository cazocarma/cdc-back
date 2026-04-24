import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { ingredientesProductoSpec } from './ingredientes-producto.schema.js';

export function buildIngredientesProductoRouter(): Router {
  return buildCrudRouter(ingredientesProductoSpec);
}
