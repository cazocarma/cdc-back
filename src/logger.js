const pino = require("pino");
const { config } = require("./config");

const logger = pino({
  level: config.app.env === "production" ? "info" : "debug",
});

module.exports = { logger };
