const jwt = require('jsonwebtoken');
const { MunicipalStaff } = require('../models');

/**
 * Session middleware — verifies HMAC-signed JWTs issued by adminAuthController.
 *
 * Security contract:
 *  - Token MUST verify against JWT_SECRET (signature + expiry enforced by jsonwebtoken).
 *  - No synthetic/fallback identities: an unverifiable token is a 401, always.
 *  - The account is re-read from the database on every request so role changes,
 *    promotions and demotions take effect immediately instead of waiting for
 *    the token to expire.
 */

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'CHIEF_ENGINEER', 'WARD_INSPECTOR', 'BUDGET_OFFICER'];

const extractToken = (req) => {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
};

const protect = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError' ? 'Session expired, please sign in again' : 'Not authorized, invalid token';
    return res.status(401).json({ success: false, message });
  }

  try {
    const staff = await MunicipalStaff.findOne({ email: payload.email }).select('-password');

    if (!staff) {
      return res.status(401).json({ success: false, message: 'Session account no longer exists' });
    }

    if (staff.isActive === false) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated' });
    }

    req.user = staff;
    req.tokenPayload = payload;
    return next();
  } catch (error) {
    console.error('[auth] Session lookup error:', error.message);
    return res.status(503).json({ success: false, message: 'Session verification unavailable' });
  }
};

/**
 * Restricts a route to privileged municipal roles.
 * Must be mounted after `protect` so `req.user` is populated.
 */
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  if (!ADMIN_ROLES.includes(req.user.role) && !req.user.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: municipal staff clearance required for this operation',
    });
  }

  return next();
};

/** Narrower guard for the most destructive operations (role management). */
const superAdminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
  if (!req.user.isSuperAdmin && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Super Admin clearance required to manage user roles',
    });
  }
  return next();
};

const verifyToken = protect;

module.exports = { protect, adminOnly, superAdminOnly, verifyToken, ADMIN_ROLES };
