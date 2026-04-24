import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { aplicacionesSpec } from './aplicaciones.schema.js';

export function buildAplicacionesRouter(): Router {
  return buildCrudRouter(aplicacionesSpec);
}
