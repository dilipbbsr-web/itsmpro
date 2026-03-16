'use strict';
const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/v1/auth/login ──────────────────────
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const { rows } = await query(
      `SELECT id, name, email, password_hash, role, dept, title, phone,
              location, status, emp_id, last_login
       FROM users WHERE email = $1`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is deactivated. Contact your administrator.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Store hashed refresh token
    const bcryptRefresh = await bcrypt.hash(refreshToken, 8);
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

    await withTransaction(async (client) => {
      // Remove old refresh tokens for this user
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);
      await client.query(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
        [user.id, bcryptRefresh, expires]
      );
      await client.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );
    });

    const { password_hash: _, ...safeUser } = user;

    res.json({
      accessToken,
      refreshToken,
      user: safeUser,
    });
  }
);

// ── POST /api/v1/auth/refresh ────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const { rows } = await query(
    `SELECT rt.token_hash, u.id, u.role, u.status
     FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.user_id = $1 AND rt.expires_at > NOW()`,
    [decoded.userId]
  );

  if (!rows.length) {
    return res.status(401).json({ error: 'Refresh token not found or expired' });
  }

  const valid = await bcrypt.compare(refreshToken, rows[0].token_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  if (rows[0].status !== 'active') {
    return res.status(401).json({ error: 'Account deactivated' });
  }

  const newAccessToken = jwt.sign(
    { userId: rows[0].id, role: rows[0].role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({ accessToken: newAccessToken });
});

// ── POST /api/v1/auth/logout ─────────────────────
router.post('/logout', authenticate, async (req, res) => {
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
  res.json({ message: 'Logged out successfully' });
});

// ── GET /api/v1/auth/me ──────────────────────────
router.get('/me', authenticate, async (req, res) => {
  const { rows } = await query(
    `SELECT id, emp_id, name, email, role, dept, title, phone, location,
            manager_id, status, doj, bio, skills, certifications, last_login, created_at
     FROM users WHERE id = $1`,
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

// ── POST /api/v1/auth/change-password ───────────
router.post('/change-password', authenticate,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }).matches(/^(?=.*[A-Z])(?=.*\d)/),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;

    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  }
);

module.exports = router;
