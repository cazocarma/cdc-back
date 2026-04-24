import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { mercadosSpec } from './mercados.schema.js';

export function buildMercadosRouter(): Router {
  return buildCrudRouter(mercadosSpec);
}
