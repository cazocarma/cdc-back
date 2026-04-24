import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { patogenosSpec } from './patogenos.schema.js';

export function buildPatogenosRouter(): Router {
  return buildCrudRouter(patogenosSpec);
}
