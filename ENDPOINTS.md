# Endpoints CDC API v1

## Publicos

- `GET /api/health`
- `GET /api/v1/health`
- `POST /api/v1/auth/login`

## JWT requerido

- `GET /api/v1`
- `GET /api/v1/auth/me`
- `GET|POST /api/v1/{resource}`
- `GET|PUT|DELETE /api/v1/{resource}/{id}`

## Notas de seguridad

- `POST /api/v1/auth/login` tiene rate limit por IP y por usuario+IP.
- `usuarios` no expone `password_hash` en respuestas.
- `POST/PUT` de `usuarios` aceptan campo `password` (el backend genera hash `scrypt`).
- `POST/PUT/DELETE` generan registros de auditoria en `cdc.CDC_auditoria`.

## Resources

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
