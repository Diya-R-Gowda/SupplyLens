const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

module.exports = (req, res, next) => {
  const header = req.header('Authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError('No token, authorization denied', 401, 'TOKEN_MISSING'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains user id, orgId, role
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError('Token has expired', 401, 'TOKEN_EXPIRED'));
    }
    return next(new ApiError('Token is not valid', 401, 'TOKEN_INVALID'));
  }
};
