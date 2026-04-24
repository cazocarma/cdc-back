import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { temporadasSpec } from './temporadas.schema.js';

export function buildTemporadasRouter(): Router {
  return buildCrudRouter(temporadasSpec);
}
