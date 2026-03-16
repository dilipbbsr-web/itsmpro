'use strict';
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

// ── Verify JWT access token ──────────────────────
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load fresh user from DB (catches deactivated accounts)
    const { rows } = await query(
      'SELECT id, name, email, role, dept, title, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (rows[0].status !== 'active') {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Role-based access ────────────────────────────
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role,
      });
    }
    next();
  };
}

// ── Convenience role groups ──────────────────────
const ROLES = {
  ALL:            ['SUPER_ADMIN','ADMIN','EMPLOYEE','HELPDESK','AGENT','SERVICE_MANAGER'],
  STAFF:          ['SUPER_ADMIN','ADMIN','HELPDESK','AGENT','SERVICE_MANAGER'],
  MANAGERS:       ['SUPER_ADMIN','ADMIN','SERVICE_MANAGER'],
  ADMINS:         ['SUPER_ADMIN','ADMIN'],
  SUPER_ADMIN_ONLY: ['SUPER_ADMIN'],
};

module.exports = { authenticate, authorize, ROLES };
