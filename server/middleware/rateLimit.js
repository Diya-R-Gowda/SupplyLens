const rateLimit = require('express-rate-limit');

// Jest sets NODE_ENV=test automatically (unless already set) before running
// the suite - a real limiter would otherwise start rejecting requests
// mid-run for reasons that have nothing to do with what's being tested,
// since e.g. tests/auth.test.js alone makes ~15 real login/register calls
// against one shared Express app instance.
const skip = () => process.env.NODE_ENV === 'test';

const jsonLimitMessage = (message) => ({
  success: false,
  error: { message, code: 'RATE_LIMITED' },
});

// Applied to the whole API: generous enough not to bother a real user
// clicking around the dashboard, but a real ceiling against a runaway
// client or scripted abuse.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: jsonLimitMessage('Too many requests, please try again later'),
});

// Applied only to POST /auth/login and POST /auth/register - the classic
// brute-force/credential-stuffing/account-creation-spam targets - tighter
// than the general limit on purpose.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: jsonLimitMessage('Too many authentication attempts, please try again later'),
});

module.exports = { generalLimiter, authLimiter };
