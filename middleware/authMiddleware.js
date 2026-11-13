const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  // Read the standard header without exposing token contents in logs or responses.
  const authorizationHeader = req.get('Authorization');
  const bearerMatch = authorizationHeader
    ? authorizationHeader.match(/^Bearer\s+(\S+)$/i)
    : null;

  if (!bearerMatch) {
    return res.status(401).json({ error: 'Token missing' });
  }

  try {
    const payload = jwt.verify(bearerMatch[1], process.env.JWT_SECRET);

    // Only accept tokens containing a positive integer user id.
    if (!payload || !Number.isSafeInteger(payload.userId) || payload.userId <= 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.userId = payload.userId;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
