import express from 'express';
import cors from 'cors';
import { pool, testConnection } from './db/connection.js';
import mediaRoutes from './routes/media.js';
import { ensureStorageDir } from './utils/storage.js';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[Media] ${req.method} ${req.path}`);
  next();
});

// Extract user from gateway-forwarded header
app.use((req, _res, next) => {
  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];
  if (userId) {
    req.user = { userId, email: userEmail };
  }
  next();
});

// Health check
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'media-service', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// Routes
app.use('/media', mediaRoutes);

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[Media] Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const start = async () => {
  await ensureStorageDir();
  await testConnection();
  app.listen(PORT, () => {
    console.log(`[Media Service] Running on port ${PORT}`);
  });
};

start().catch(err => {
  console.error('[Media] Failed to start:', err);
  process.exit(1);
});
