// ── Redis client singleton ─────────────────────────────────────────
// Pool unico usado por connect-redis (session store). DB reservada
// segun el estandar de la plataforma (CDC = 3).

const { createClient } = require("redis");
const { config } = require("../config");
const { logger } = require("../logger");

const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
    reconnectStrategy: (retries) => Math.min(1000 * 2 ** retries, 30_000),
  },
  password: config.redis.password,
  database: config.redis.db,
});

redisClient.on("error", (err) => logger.error({ err }, "redis.error"));
redisClient.on("connect", () => logger.info({ db: config.redis.db }, "redis.connect"));
redisClient.on("ready", () => logger.info("redis.ready"));

async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
}

module.exports = { redisClient, connectRedis };
