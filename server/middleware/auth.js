const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const header = req.header('Authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains user id, orgId, role
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
