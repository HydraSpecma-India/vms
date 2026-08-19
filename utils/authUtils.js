const jwt = require('jsonwebtoken');

// Hardcoded secret for standalone deployable simplicity.
// In a real cloud env, this would be in process.env.JWT_SECRET.
const JWT_SECRET = 'vms-super-secret-key-2026';

function generateToken(user) {
  return jwt.sign(
    { username: user.username, role: user.role, requiresPasswordChange: user.requiresPasswordChange },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

/**
 * Middleware to authenticate requests via JWT.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

  // Fallback to query token (e.g. for image requests)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (token == null) {
    return res.status(401).json({ error: true, message: 'Authentication required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: true, message: 'Invalid or expired token.' });
    }
    
    // Attach user payload to request
    req.user = decodedUser;
    
    // If user requires password change, restrict them from using APIs other than change-password
    if (decodedUser.requiresPasswordChange && req.path !== '/change-password') {
       return res.status(403).json({ error: true, requiresPasswordChange: true, message: 'You must change your password before continuing.' });
    }

    next();
  });
}

/**
 * Middleware to ensure the user has the 'admin' role.
 * MUST be placed after authenticateToken.
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: true, message: 'Access denied. Admin privileges required.' });
  }
  next();
}

module.exports = {
  generateToken,
  authenticateToken,
  requireAdmin
};
