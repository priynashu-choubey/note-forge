import { Router } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/connection.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshExpiryDate,
} from '../utils/jwt.js';

const router = Router();
const SALT_ROUNDS = 12;

// POST /auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await query(
      `INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, avatar_url, created_at`,
      [email.toLowerCase(), hashedPassword, name || null]
    );

    const user = result.rows[0];
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, getRefreshExpiryDate()]
    );

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      'SELECT id, email, password, name, avatar_url FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, getRefreshExpiryDate()]
    );

    res.json({
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify token signature
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Check token exists in DB and hasn't been revoked
    const tokenResult = await query(
      'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token = $1',
      [refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token not found or revoked' });
    }

    const storedToken = tokenResult.rows[0];
    if (new Date(storedToken.expires_at) < new Date()) {
      await query('DELETE FROM refresh_tokens WHERE id = $1', [storedToken.id]);
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Get user
    const userResult = await query(
      'SELECT id, email, name, avatar_url FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Rotate: delete old, create new
    await query('DELETE FROM refresh_tokens WHERE id = $1', [storedToken.id]);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, newRefreshToken, getRefreshExpiryDate()]
    );

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      const { verifyAccessToken } = await import('../utils/jwt.js');
      payload = verifyAccessToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const result = await query(
      'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = $1',
      [payload.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url, createdAt: user.created_at },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
