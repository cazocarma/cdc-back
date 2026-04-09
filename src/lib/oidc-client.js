// ── OIDC client singleton ──────────────────────────────────────────
// Una sola instancia de openid-client.Client compartida entre rutas
// y middlewares. Hace discovery contra el endpoint interno y valida
// tokens contra el issuer publico.
//
// El issuer canonico (claim 'iss' del id_token emitido por Keycloak)
// debe coincidir EXACTO con OIDC_ISSUER_URL — la URL publica vista por
// el browser. La discovery puede venir de un host interno distinto
// (cdc-back -> keycloak:8080 dentro de platform_identity).

const { Issuer, custom } = require("openid-client");
const { config } = require("../config");
const { logger } = require("../logger");

let clientPromise = null;

async function buildClient() {
  // Discovery contra la URL publica del realm: la metadata trae los
  // endpoints (auth, token, logout, jwks) que el browser resuelve por
  // el mismo origen. Si el iss difiere de OIDC_ISSUER_URL avisamos:
  // el back valida tokens contra el iss canonico configurado.
  const issuer = await Issuer.discover(config.oidc.discoveryUrl);

  if (issuer.metadata.issuer !== config.oidc.issuerUrl) {
    logger.warn(
      { discovered: issuer.metadata.issuer, expected: config.oidc.issuerUrl },
      "oidc.issuer mismatch"
    );
  }

  logger.info({ issuer: issuer.metadata.issuer }, "oidc.discovery ok");

  const client = new issuer.Client({
    client_id: config.oidc.clientId,
    client_secret: config.oidc.clientSecret,
    redirect_uris: [config.oidc.redirectUri],
    response_types: ["code"],
    token_endpoint_auth_method: "client_secret_basic",
  });

  // Timeouts cortos: el cdc-back no debe quedarse colgado si Keycloak tarda.
  client[custom.http_options] = (_url, options) => ({ ...options, timeout: 5000 });

  return client;
}

function getClient() {
  if (!clientPromise) {
    clientPromise = buildClient().catch((err) => {
      // Reintentamos la proxima llamada en caso de fallo transitorio.
      clientPromise = null;
      logger.error({ err }, "oidc.discovery failed");
      throw err;
    });
  }
  return clientPromise;
}

module.exports = { getClient };
