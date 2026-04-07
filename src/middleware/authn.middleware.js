const jwt = require("jsonwebtoken");
const { config } = require("../config");

function extractBearerToken(headerValue) {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

function requireJwtAuthn(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ message: "Token no enviado." });
  }

  try {
    const payload = jwt.verify(token, config.authn.jwtSecret, {
      algorithms: ["HS256"],
      issuer: "greenvic-cdc",
      audience: "greenvic-cdc-api",
    });
    req.authnClaims = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Token invalido o expirado." });
  }
}

module.exports = { requireJwtAuthn, extractBearerToken };
