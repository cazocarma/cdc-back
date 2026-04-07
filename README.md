# cdc-back

Backend HTTP de **Cuaderno de Campo** (CDC). Express + Node 20, SQL Server vía `mssql`, autenticacion JWT, CRUD generico declarativo y contrato JSON 100% **camelCase**.

## Stack

- **Runtime:** Node 20 (`bookworm-slim`)
- **Framework:** Express 4
- **DB driver:** `mssql` (Tedious) sobre SQL Server
- **Auth:** JWT HS256 (`jsonwebtoken`)
- **Validacion:** `zod` en cuerpo y query
- **Logging:** `pino` (logs estructurados)
- **Rate limiting:** in-memory por IP y por usuario+IP en `/auth/login`

## Estructura

```
src/
  app.js                  Composicion del express app (helmet, cors, rate-limit, rutas)
  index.js                Bootstrap del servidor
  config.js               Carga y validacion de variables de entorno
  db.js                   Pool mssql singleton
  logger.js               Pino logger
  resources-config.js     Mapeo declarativo apiKey<->dbColumn por recurso
  middleware/
    authn.middleware.js   Verificacion JWT
    rate-limit.middleware.js
    validate.middleware.js  Validacion zod
  routes/
    auth.routes.js        POST /auth/login, GET /auth/me
    resources.routes.js   CRUD generico parametrizado por resources-config
```

## Contrato HTTP

El back expone un contrato JSON en **camelCase**, totalmente desacoplado del esquema fisico de la base de datos:

- **PK** siempre se expone como `id`
- **FKs** siguen el patron `<entidad>Id` (ej: `productorId`, `especieId`, `temporadaId`)
- **Atributos** en camelCase (`fechaInicio`, `codigoSap`, `nombreComercial`, …)

Ejemplo de respuesta:

```json
GET /api/v1/temporadas?page=1&pageSize=2

{
  "page": 1,
  "pageSize": 2,
  "total": 2,
  "data": [
    {
      "id": 1,
      "codigo": "2025-2026",
      "nombre": "Temporada 2025-2026",
      "fechaInicio": "2025-07-01T00:00:00.000Z",
      "fechaFin": "2026-06-30T00:00:00.000Z",
      "activa": true
    }
  ]
}
```

### Capa de mapeo apiKey ↔ dbColumn

`resources-config.js` declara, por cada recurso, un array `columns: [{ api, db, insertable, updatable, searchable }]`. Esto:

- Permite que la BD use PascalCase (`Codigo`, `FechaInicio`, `ProductorId`) y la API exponga camelCase (`codigo`, `fechaInicio`, `productorId`) sin acoplamiento.
- Renombrar una columna en BD = tocar solo el `db:` correspondiente. Renombrar el contrato HTTP = tocar solo el `api:`.
- Las queries del CRUD generico hacen `SELECT [Codigo] AS [codigo], [FechaInicio] AS [fechaInicio], …` automaticamente via `buildSelectList()`.

## Endpoints

### Publicos

- `GET /api/health` — healthcheck
- `POST /api/v1/auth/login` — login (rate-limited)

### Protegidos (JWT requerido)

Header: `Authorization: Bearer <token>`

- `GET /api/v1/auth/me` — info del usuario actual
- `GET /api/v1` — lista de recursos disponibles
- `GET /api/v1/{resource}?page=&pageSize=&q=` — listado paginado con busqueda LIKE en columnas marcadas `searchable`
- `POST /api/v1/{resource}` — crear (acepta solo columnas marcadas `insertable`)
- `GET /api/v1/{resource}/{id}` — obtener por id
- `PUT /api/v1/{resource}/{id}` — actualizar (acepta solo columnas marcadas `updatable`)
- `DELETE /api/v1/{resource}/{id}` — eliminar

### Recursos disponibles

`usuarios`, `auditoria` *(solo lectura)*, `temporadas`, `exportadores`, `productores`, `agronomos`, `especies`, `variedades`, `condiciones-fruta`, `fundos`, `predios`, `familias-quimicos`, `ingredientes-activos`, `tipos-agua`, `patogenos`, `productos`, `productos-especie`, `ingredientes-producto`, `mercados`, `reglas`, `cuadros`, `aplicaciones`.

Ver [ENDPOINTS.md](ENDPOINTS.md) para detalle de payloads y notas de seguridad.

## Autenticacion

- Login valida usuario/password contra `cdc.Usuario`.
- `verifyPassword` soporta hashes con prefijo `sha256:` (SHA-256 hex de la contraseña). Texto plano es solo para bootstrap inicial y debe migrarse.
- El JWT incluye `sub` (id de usuario), `usuario`, `nombre`, issuer `greenvic-cdc`, audience `greenvic-cdc-api`.
- Respuesta de login:
  ```json
  {
    "accessToken": "...",
    "tokenType": "Bearer",
    "user": { "id": 1, "usuario": "admin", "nombre": "Administrador" }
  }
  ```

## Variables de entorno

| Variable | Default | Proposito |
|---|---|---|
| `PORT` | `4000` | Puerto HTTP |
| `NODE_ENV` | `development` | Modo de ejecucion |
| `CORS_ORIGIN` | — | Origen permitido (URL del front) |
| `DB_HOST` | — | Host SQL Server |
| `DB_PORT` | `1433` | Puerto SQL Server |
| `DB_NAME` | — | Nombre de la base |
| `DB_USER` | — | Usuario SQL |
| `DB_PASSWORD` | — | Password SQL |
| `DB_ENCRYPT` | `true` | TLS al motor |
| `DB_TRUST_SERVER_CERTIFICATE` | `true` | Aceptar cert auto-firmado |
| `JWT_SECRET` | — | Clave HS256 (>= 32 bytes) |
| `JWT_EXPIRES_IN` | `8h` | Vigencia del token |
| `LOGIN_RATE_LIMIT_PER_IP` | `40` | Intentos por IP / 15 min |
| `LOGIN_RATE_LIMIT_PER_USER_IP` | `10` | Intentos por usuario+IP / 15 min |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | `900000` | Ventana del rate limit |

En desarrollo se carga desde `cdc-infra/.env` (no usa `.env` propio).

## Desarrollo

El back se ejecuta dentro del stack de `cdc-infra` con bind-mount al codigo fuente y `npm run dev` (watch mode):

```bash
cd /opt/cdc/repos/cdc-infra
make up        # levanta el stack completo (front + back)
make logs-cdc-back
```

El contenedor reinicia automaticamente al guardar cambios en `src/` gracias a `node --watch`.

### Smoke test

```bash
docker exec greenvic-cdc-back-1 node -e '
const http=require("http");
const data=JSON.stringify({usuario:"admin",password:"123456789"});
const req=http.request({hostname:"localhost",port:4000,path:"/api/v1/auth/login",
  method:"POST",headers:{"Content-Type":"application/json","Content-Length":data.length}},
  r=>{let b="";r.on("data",d=>b+=d);r.on("end",()=>console.log(r.statusCode,b))});
req.write(data);req.end();
'
```
