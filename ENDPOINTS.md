# Endpoints CDC API v1

Base URL: `/api/v1`. Todos los payloads (request y response) usan **camelCase**.

## Publicos

| Metodo | Path | Notas |
|---|---|---|
| `GET` | `/api/health` | Healthcheck del proceso |
| `POST` | `/api/v1/auth/login` | Login con rate limit por IP y por usuario+IP |

### `POST /api/v1/auth/login`

```json
// request
{ "usuario": "admin", "password": "123456789" }

// 200
{
  "accessToken": "eyJhbGciOiJIUzI1NiI...",
  "tokenType": "Bearer",
  "user": { "id": 1, "usuario": "admin", "nombre": "Administrador" }
}

// 401 (credenciales invalidas o usuario inactivo)
{ "message": "Credenciales invalidas." }
```

## Protegidos (JWT requerido)

Header: `Authorization: Bearer <token>`

| Metodo | Path | Proposito |
|---|---|---|
| `GET` | `/api/v1` | Lista de recursos disponibles |
| `GET` | `/api/v1/auth/me` | Info del usuario actual extraida del JWT |
| `GET` | `/api/v1/{resource}` | Listado paginado |
| `POST` | `/api/v1/{resource}` | Crear |
| `GET` | `/api/v1/{resource}/{id}` | Obtener por id |
| `PUT` | `/api/v1/{resource}/{id}` | Actualizar |
| `DELETE` | `/api/v1/{resource}/{id}` | Eliminar |

### Listado: `GET /api/v1/{resource}`

Query params:

- `page` (default `1`)
- `pageSize` (default `20`, max `100`)
- `q` — busqueda LIKE en columnas marcadas `searchable` del recurso

Respuesta:

```json
{
  "page": 1,
  "pageSize": 20,
  "total": 42,
  "data": [ /* objetos del recurso */ ]
}
```

### Crear / actualizar

El backend acepta unicamente las claves declaradas como `insertable` (POST) o `updatable` (PUT) en `resources-config.js`. Cualquier clave extra se ignora silenciosamente. Si el payload no contiene ninguna clave valida, devuelve `422`.

```json
// POST /api/v1/temporadas
{
  "codigo": "2025-2026",
  "nombre": "Temporada 2025-2026",
  "fechaInicio": "2025-07-01",
  "fechaFin": "2026-06-30",
  "activa": true
}

// 201
{ "id": 3 }
```

```json
// PUT /api/v1/temporadas/3
{ "activa": false }

// 200
{ "affected": 1 }
```

## Seguridad

- `POST /api/v1/auth/login` aplica rate limiting in-memory con dos buckets: por IP (`LOGIN_RATE_LIMIT_PER_IP`) y por combinacion usuario+IP (`LOGIN_RATE_LIMIT_PER_USER_IP`). Ventana configurable via `LOGIN_RATE_LIMIT_WINDOW_MS`.
- Las queries usan parametros nombrados (`mssql` `Request.input`), no concatenacion de strings. Los nombres de tabla y columna provienen de `resources-config.js`, nunca del usuario.
- Las columnas marcadas como sensibles (ej. `passwordHash`) **no** deben aparecer en `searchable` y conviene tampoco en `updatable` desde el CRUD generico — para cambios de password se debe usar un endpoint dedicado (TODO).
- Recursos con `readOnly: true` (`auditoria`) bloquean POST/PUT/DELETE con `405`.

## Recursos

| Resource | PK | Tabla |
|---|---|---|
| `usuarios` | `id` | `cdc.Usuario` |
| `auditoria` *(readOnly)* | `id` | `cdc.Auditoria` |
| `temporadas` | `id` | `cdc.Temporada` |
| `exportadores` | `id` | `cdc.Exportador` |
| `productores` | `id` | `cdc.Productor` |
| `agronomos` | `id` | `cdc.Agronomo` |
| `especies` | `id` | `cdc.Especie` |
| `variedades` | `id` | `cdc.Variedad` |
| `condiciones-fruta` | `id` | `cdc.CondicionFruta` |
| `fundos` | `id` | `cdc.Fundo` |
| `predios` | `id` | `cdc.Predio` |
| `familias-quimicos` | `id` | `cdc.FamiliaQuimico` |
| `ingredientes-activos` | `id` | `cdc.IngredienteActivo` |
| `tipos-agua` | `id` | `cdc.TipoAgua` |
| `patogenos` | `id` | `cdc.Patogeno` |
| `productos` | `id` | `cdc.Producto` |
| `productos-especie` | `id` | `cdc.ProductoEspecie` |
| `ingredientes-producto` | `id` | `cdc.IngredienteProducto` |
| `mercados` | `id` | `cdc.Mercado` |
| `reglas` | `id` | `cdc.Regla` |
| `cuadros` | `id` | `cdc.Cuadro` |
| `aplicaciones` | `id` | `cdc.Aplicacion` |
