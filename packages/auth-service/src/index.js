import express from 'express';
import cors from 'cors';
import { pool, testConnection } from './db/connection.js';
import authRoutes from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[Auth] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'auth-service', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// Routes
app.use('/auth', authRoutes);

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[Auth] Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const start = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`[Auth Service] Running on port ${PORT}`);
  });
};

start().catch(err => {
  console.error('[Auth] Failed to start:', err);
  process.exit(1);
});
