const ApiError = require('../utils/ApiError');

const sendError = (res, status, message, code, details) => {
  const error = { message, code };
  if (details) error.details = details;
  return res.status(status).json({ success: false, error });
};

// Last middleware in the chain (index.js) - anything passed to next(err)
// anywhere in the app ends up here.
module.exports = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.name === 'CastError') {
    return sendError(res, 400, `Invalid ${err.path}: ${err.value}`, 'INVALID_ID');
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    return sendError(res, 409, `A record with that ${field} already exists`, 'DUPLICATE_KEY', { field });
  }

  if (err.name === 'ValidationError') {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([field, fieldErr]) => [field, fieldErr.message])
    );
    return sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', details);
  }

  if (err instanceof ApiError) {
    return sendError(res, err.statusCode, err.message, err.code, err.details);
  }

  // Unrecognized/programmer error: log the real thing server-side, never leak
  // it (message or stack) to the client.
  console.error(err);
  return sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
};
