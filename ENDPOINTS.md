# Endpoints CDC API v1

Backend BFF OIDC contra Keycloak (ver `platform/docs/AUTH_STANDARD.md`).
La identidad se lleva en la cookie **`cdc.sid`** (HttpOnly, SameSite=Strict),
respaldada por Redis (`cdc:sess:<sid>`). Los tokens OIDC nunca viajan al browser.

## Publicos

- `GET /api/health` → `{ status:"ok", db:"ok"|"degraded" }`
- `GET /api/v1/auth/login?returnTo=<ruta>` → `302` al `authorization_endpoint` de Keycloak.
- `GET /api/v1/auth/callback?code&state` → `302` a `returnTo` o `/` (regenera sid + Set-Cookie). En error `302 /login?error=forbidden_role|callback_failed`.

## Con sesion

- `GET /api/v1/auth/me` → `{ user: { id, sub, usuario, nombre, email, role }, csrfToken }` o `401`.
- `POST /api/v1/auth/logout` (requiere `X-CSRF-Token`) → end_session en Keycloak + destroy + `204`.

## Contrato de errores

Shape comun: `{ "error": { "code": string, "message": string, "details"?: unknown } }`.
Codigos: `unauthorized`, `session_expired`, `forbidden`, `csrf_invalid`, `validation_failed`, `not_found`, `internal_error`.

## CSRF

- Header `X-CSRF-Token` obligatorio en `POST/PUT/PATCH/DELETE`.
- Token lo entrega `GET /api/v1/auth/me` (`csrfToken`). Comparacion con `timingSafeEqual`.
- Metodos seguros (`GET/HEAD/OPTIONS`) no requieren CSRF.

## Auditoria

`cdc.Auditoria` con `Origen='OIDC'`. Eventos: `LOGIN`, `LOGOUT`, `REFRESH_FAIL`, `CSRF_FAIL`, `UNAUTHORIZED`, `FORBIDDEN_ROLE`.

## Roles

- Minimo requerido: `cdc-user` (env `OIDC_REQUIRED_ROLE`). Sin el rol en `realm_access.roles` el callback responde `forbidden_role` y no crea fila en `cdc.Usuario`.

## Rutas de negocio

Las features de negocio (temporadas, cuadros, aplicaciones, etc.) se montaran como
controllers dedicados bajo `src/features/*/` siguiendo el mismo patron que auth,
cada uno con `authnMiddleware` + `csrfMiddleware` delante. Aun no implementadas.
