import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { exportadoresSpec } from './exportadores.schema.js';

export function buildExportadoresRouter(): Router {
  return buildCrudRouter(exportadoresSpec);
}
