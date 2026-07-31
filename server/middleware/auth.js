const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const header = req.header('Authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ msg: 'No token, authorization denied', code: 'TOKEN_MISSING' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains user id, orgId, role
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token has expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ msg: 'Token is not valid', code: 'TOKEN_INVALID' });
  }
};
