import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { tiposAguaSpec } from './tipos-agua.schema.js';

export function buildTiposAguaRouter(): Router {
  return buildCrudRouter(tiposAguaSpec);
}
