import type { Router } from 'express';
import { buildCrudRouter } from '../../shared/crud.js';
import { usuariosSpec } from './usuarios.schema.js';

export function buildUsuariosRouter(): Router {
  return buildCrudRouter(usuariosSpec);
}
