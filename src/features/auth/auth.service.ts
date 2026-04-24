import type { Request } from 'express';
import { Issuer, custom, generators, type Client, type TokenSet } from 'openid-client';
import { randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { HttpError } from '../../middleware/error.js';
import { upsertUsuario, type UsuarioRow } from './auth.repository.js';

// El default de openid-client v5 es 3500ms — insuficiente cuando Keycloak
// rehidrata cache Infinispan o arranca en frio. 10s absorbe esos picos sin
// quedarse corto en operacion normal (discovery tipico <200ms).
custom.setHttpOptionsDefaults({ timeout: 10_000 });

let cachedClient: Client | null = null;
let inFlightClient: Promise<Client> | null = null;

export async function getOidcClient(): Promise<Client> {
  if (cachedClient) return cachedClient;
  if (inFlightClient) return inFlightClient;

  inFlightClient = (async () => {
    const issuer = await Issuer.discover(env.OIDC_DISCOVERY_URL);
    const client = new issuer.Client({
      client_id: env.OIDC_CLIENT_ID,
      client_secret: env.OIDC_CLIENT_SECRET,
      redirect_uris: [env.OIDC_REDIRECT_URI],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_basic',
    });
    cachedClient = client;
    logger.info({ issuer: issuer.metadata.issuer }, 'OIDC issuer descubierto');
    return client;
  })();

  try {
    return await inFlightClient;
  } catch (err) {
    // Permitir reintento en el proximo call — no cachear el fallo.
    inFlightClient = null;
    throw err;
  }
}

export async function warmUpOidc(): Promise<void> {
  try {
    await getOidcClient();
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      'pre-warm OIDC fallo — el primer login reintentara'
    );
  }
}

export async function buildAuthorizationUrl(req: Request, returnTo: string): Promise<string> {
  const client = await getOidcClient();
  const state = generators.state();
  const nonce = generators.nonce();
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);

  req.session.preAuth = { state, nonce, codeVerifier, returnTo };

  return client.authorizationUrl({
    scope: env.OIDC_SCOPES,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
}

export interface CallbackResult {
  usuario: UsuarioRow;
  tokenSet: TokenSet;
  returnTo: string;
  role: string;
}

export async function handleCallback(req: Request): Promise<CallbackResult> {
  const preAuth = req.session.preAuth;
  if (!preAuth) {
    throw new HttpError(400, 'no_preauth', 'Sesion de pre-autenticacion no encontrada');
  }

  const client = await getOidcClient();
  const params = client.callbackParams(req);

  let tokenSet: TokenSet;
  try {
    tokenSet = await client.callback(env.OIDC_REDIRECT_URI, params, {
      state: preAuth.state,
      nonce: preAuth.nonce,
      code_verifier: preAuth.codeVerifier,
    });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'OIDC callback fallo');
    throw new HttpError(400, 'oidc_callback_failed', 'No se pudo completar el login');
  }

  const claims = tokenSet.claims();
  const realmAccess = claims.realm_access as { roles?: string[] } | undefined;
  const roles: string[] = Array.isArray(realmAccess?.roles) ? realmAccess.roles : [];

  if (!roles.includes(env.OIDC_REQUIRED_ROLE)) {
    throw new HttpError(403, 'forbidden_role', 'Usuario sin acceso a CDC');
  }

  const preferredUsername = claims.preferred_username as string | undefined;
  const name = claims.name as string | undefined;
  const email = (claims.email as string | undefined) ?? null;

  const usuario = await upsertUsuario({
    sub: claims.sub,
    usuario: preferredUsername ?? email ?? claims.sub,
    nombre: name ?? preferredUsername ?? claims.sub,
    email,
    primaryRole: env.OIDC_REQUIRED_ROLE,
  });

  if (!usuario.Activo) {
    throw new HttpError(403, 'forbidden_role', 'Usuario suspendido en CDC');
  }

  return {
    usuario,
    tokenSet,
    returnTo: preAuth.returnTo,
    role: env.OIDC_REQUIRED_ROLE,
  };
}

/**
 * Refresh proactivo: si el access_token esta a menos de 30s de expirar,
 * rota via refresh_token. Keycloak tiene refreshTokenMaxReuse=0, asi que
 * el nuevo refresh_token reemplaza al anterior obligatoriamente.
 */
export async function refreshIfNeeded(req: Request): Promise<void> {
  const expiresAt = req.session.accessTokenExpiresAt ?? 0;
  const now = Date.now();
  if (expiresAt - now > 30_000) return;
  if (!req.session.refreshToken) throw new Error('No refresh token en sesion');

  const client = await getOidcClient();
  const next = await client.refresh(req.session.refreshToken);

  req.session.accessToken = next.access_token;
  if (next.refresh_token) req.session.refreshToken = next.refresh_token;
  if (next.id_token) req.session.idToken = next.id_token;
  req.session.accessTokenExpiresAt = next.expires_at
    ? next.expires_at * 1000
    : now + 300_000;
}

export async function buildEndSessionUrl(idToken: string): Promise<string> {
  const client = await getOidcClient();
  return client.endSessionUrl({
    id_token_hint: idToken,
    post_logout_redirect_uri: env.OIDC_POST_LOGOUT_REDIRECT_URI,
  });
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}
