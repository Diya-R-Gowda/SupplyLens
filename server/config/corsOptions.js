const ApiError = require('../utils/ApiError');

// Local-dev-only fallback so `npm run dev` keeps working with zero config -
// the Vite dev server (5173) and the Docker-compose client (8080), both at
// localhost and 127.0.0.1. Any real deployment should set CORS_ORIGIN
// explicitly rather than relying on this list.
const DEV_FALLBACK_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = configuredOrigins.length ? configuredOrigins : DEV_FALLBACK_ORIGINS;

if (!configuredOrigins.length && process.env.NODE_ENV !== 'test') {
  console.warn(
    `CORS_ORIGIN is not set - falling back to local-dev origins only (${DEV_FALLBACK_ORIGINS.join(', ')}). `
    + 'Set CORS_ORIGIN (comma-separated) in production.'
  );
}

module.exports = {
  origin: (origin, callback) => {
    // No Origin header at all - same-origin requests, curl, server-to-server
    // calls, and Postman-style tools never send one; nothing to check against.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new ApiError('Origin not allowed by CORS policy', 403, 'CORS_FORBIDDEN'));
  },
};
