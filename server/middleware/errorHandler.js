const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

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
    // For a compound unique index, every field in the key is part of what
    // collided (e.g. {orgId,name} - naming only "orgId" would be misleading,
    // since orgId alone is never unique) - so list all of them.
    const fields = Object.keys(err.keyValue || err.keyPattern || {});
    const fieldList = fields.join(', ') || 'field';
    return sendError(res, 409, `A record with that ${fieldList} already exists`, 'DUPLICATE_KEY', { fields });
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
  // it (message or stack) to the client, in any environment - not just
  // production. There's no "show the stack trace in dev" branch here on
  // purpose: the client-facing response is identical everywhere, so that
  // behavior is never accidentally different in whichever environment this
  // actually gets deployed to.
  logger.error({ err }, 'Unhandled error');
  return sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
};
