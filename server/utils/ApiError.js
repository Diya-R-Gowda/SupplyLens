// Thrown from anywhere in the app for an expected/operational failure (bad
// input, not found, forbidden, etc.) - the centralized error middleware knows
// these are safe to surface err.message from directly to the client.
class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
