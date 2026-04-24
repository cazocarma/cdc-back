import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { auditoriaSpec } from './auditoria.schema.js';

export function buildAuditoriaRouter(): Router {
  return buildCrudRouter(auditoriaSpec);
}
