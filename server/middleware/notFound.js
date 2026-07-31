const ApiError = require('../utils/ApiError');

// Mounted after all real routes, before the error-handling middleware -
// anything that reaches here matched no route.
module.exports = (req, res, next) => {
  next(new ApiError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
};
