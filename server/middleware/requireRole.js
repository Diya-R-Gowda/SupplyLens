const ApiError = require('../utils/ApiError');

// Must run after auth middleware, which populates req.user from the access token.
module.exports = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError('Forbidden: insufficient permissions', 403, 'FORBIDDEN'));
  }
  next();
};
