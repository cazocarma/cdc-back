import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { variedadesSpec } from './variedades.schema.js';

export function buildVariedadesRouter(): Router {
  return buildCrudRouter(variedadesSpec);
}
