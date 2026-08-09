const pino = require('pino');

// pino-pretty is a devDependency-shaped concern (human-readable, slower) -
// deliberately not installed/used here at all, even in dev, so there's only
// one log format to reason about and no risk of it accidentally shipping to
// production. Structured JSON lines are still perfectly readable via `npm
// run dev | npx pino-pretty` locally if wanted, without this file needing
// to know or care which environment it's running in.
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Never let a secret leak into a log line even if a caller passes the
  // whole req/user object into a log call carelessly later.
  redact: {
    paths: ['req.headers.authorization', 'password', 'token', 'accessToken', 'refreshToken', 'jwt', '*.password', '*.token', '*.accessToken', '*.refreshToken'],
    censor: '[REDACTED]',
  },
});

module.exports = logger;
