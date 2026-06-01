import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { testConnection as testAuthDb } from './db/authDb.js';
import { testConnection as testNotesDb } from './db/notesDb.js';
import { ensureStorageDir } from './utils/storage.js';

import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import foldersRoutes from './routes/folders.js';
import mediaRoutes from './routes/media.js';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// General Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use(limiter);

// Auth Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later' },
});

// Logging
app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', async (_req, res) => {
  try {
    await Promise.all([
      testAuthDb(),
      testNotesDb()
    ]);
    res.json({
      status: 'healthy',
      service: 'api-monolith',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      error: err.message,
    });
  }
});

// Mount Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/media', mediaRoutes);

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error('[API] Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const start = async () => {
  // Ensure DB and Storage are initialized
  await testAuthDb();
  await testNotesDb();
  await ensureStorageDir();

  app.listen(PORT, () => {
    console.log(`[API Monolith] Running on port ${PORT}`);
  });
};

start().catch(err => {
  console.error('[API Monolith] Failed to start:', err);
  process.exit(1);
});
