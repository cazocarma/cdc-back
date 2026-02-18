# CDC Back

Backend API (Next.js Route Handlers) para Cuaderno de Campo.

## Autenticacion

- `POST /api/v1/auth/login` (publico)
- `GET /api/v1/auth/me` (JWT requerido)
- `GET /api/v1/health` (publico)

Header para endpoints protegidos:

`Authorization: Bearer <token>`

## Endpoints deducidos del modelo CDC

Todos soportan base CRUD:

- `GET /api/v1/{recurso}`
- `POST /api/v1/{recurso}`
- `GET /api/v1/{recurso}/{id}`
- `PUT /api/v1/{recurso}/{id}`
- `DELETE /api/v1/{recurso}/{id}`

Recursos habilitados:

- `usuarios`
- `auditoria` (solo lectura)
- `temporadas`
- `exportadores`
- `productores`
- `agronomos`
- `especies`
- `variedades`
- `condiciones-fruta`
- `fundos`
- `predios`
- `familias-quimicos`
- `ingredientes-activos`
- `tipos-agua`
- `patogenos`
- `productos`
- `productos-especie`
- `ingredientes-producto`
- `mercados`
- `reglas`
- `cuadros`
- `aplicaciones`

## Variables de entorno

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (default `8h`)

## Notas

- Login valida contra `cdc.CDC_usuario`.
- `password_hash` acepta `sha256:<hex>` o texto plano.
