import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { fundosSpec } from './fundos.schema.js';

export function buildFundosRouter(): Router {
  return buildCrudRouter(fundosSpec);
}
