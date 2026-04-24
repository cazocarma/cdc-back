import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { cuadrosSpec } from './cuadros.schema.js';

export function buildCuadrosRouter(): Router {
  return buildCrudRouter(cuadrosSpec);
}
