// Must run after auth middleware, which populates req.user from the access token.
module.exports = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ msg: 'Forbidden: insufficient permissions', code: 'FORBIDDEN' });
  }
  next();
};
