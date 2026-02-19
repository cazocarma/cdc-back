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
- `LOGIN_RATE_LIMIT_PER_IP` (default `40` por 15 min)
- `LOGIN_RATE_LIMIT_PER_USER_IP` (default `10` por 15 min)
- `LOGIN_RATE_LIMIT_WINDOW_MS` (default `900000`)

## Notas

- Login valida contra `cdc.CDC_usuario`.
- Si el hash existente es legacy (`sha256:` o texto plano), se migra automaticamente a `scrypt` al hacer login correcto.
- En CRUD de `usuarios`, el backend recibe `password` y genera `password_hash` en servidor.
- Las operaciones `POST/PUT/DELETE` registran auditoria en `cdc.CDC_auditoria` (origen `API`).
