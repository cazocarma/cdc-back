import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { agronomosSpec } from './agronomos.schema.js';

export function buildAgronomosRouter(): Router {
  return buildCrudRouter(agronomosSpec);
}
