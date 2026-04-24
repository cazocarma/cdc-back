import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { reglasSpec } from './reglas.schema.js';

export function buildReglasRouter(): Router {
  return buildCrudRouter(reglasSpec);
}
