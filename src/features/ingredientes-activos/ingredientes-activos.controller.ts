import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { ingredientesActivosSpec } from './ingredientes-activos.schema.js';

export function buildIngredientesActivosRouter(): Router {
  return buildCrudRouter(ingredientesActivosSpec);
}
