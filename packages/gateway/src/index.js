import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Service URLs
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  notes: process.env.NOTES_SERVICE_URL || 'http://localhost:3002',
  media: process.env.MEDIA_SERVICE_URL || 'http://localhost:3003',
};

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use(limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later' },
});

// Request logging
app.use((req, _res, next) => {
  console.log(`[Gateway] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'gateway',
    timestamp: new Date().toISOString(),
    services: SERVICES,
  });
});

// --- Auth routes (no JWT required) ---
app.use('/api/auth', authLimiter, createProxyMiddleware({
  target: SERVICES.auth,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/auth' },
  on: {
    proxyReq: (proxyReq, req) => {
      // Forward body for POST requests
      if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    error: (err, _req, res) => {
      console.error('[Gateway] Auth proxy error:', err.message);
      if (res.headersSent) return;
      res.status(502).json({ error: 'Auth service unavailable' });
    },
  },
}));

// --- Protected routes (JWT required) ---

// Parse JSON body before auth middleware (needed for proxy body forwarding)
app.use(express.json({ limit: '10mb' }));

// Notes routes
app.use('/api/notes', authMiddleware, createProxyMiddleware({
  target: SERVICES.notes,
  changeOrigin: true,
  pathRewrite: { '^/api/notes': '/notes' },
  on: {
    proxyReq: (proxyReq, req) => {
      // Forward user info to downstream service
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.userId);
        proxyReq.setHeader('X-User-Email', req.user.email || '');
      }
      if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    error: (err, _req, res) => {
      console.error('[Gateway] Notes proxy error:', err.message);
      if (res.headersSent) return;
      res.status(502).json({ error: 'Notes service unavailable' });
    },
  },
}));

// Folders routes
app.use('/api/folders', authMiddleware, createProxyMiddleware({
  target: SERVICES.notes,
  changeOrigin: true,
  pathRewrite: { '^/api/folders': '/folders' },
  on: {
    proxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.userId);
        proxyReq.setHeader('X-User-Email', req.user.email || '');
      }
      if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    error: (err, _req, res) => {
      console.error('[Gateway] Folders proxy error:', err.message);
      if (res.headersSent) return;
      res.status(502).json({ error: 'Notes service unavailable' });
    },
  },
}));

// Media routes
app.use('/api/media', authMiddleware, createProxyMiddleware({
  target: SERVICES.media,
  changeOrigin: true,
  pathRewrite: { '^/api/media': '/media' },
  on: {
    proxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.userId);
        proxyReq.setHeader('X-User-Email', req.user.email || '');
      }
      // Don't rewrite body for multipart (file uploads)
      if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method) && req.headers['content-type']?.includes('application/json')) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    error: (err, _req, res) => {
      console.error('[Gateway] Media proxy error:', err.message);
      if (res.headersSent) return;
      res.status(502).json({ error: 'Media service unavailable' });
    },
  },
}));

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[Gateway] Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`[API Gateway] Running on port ${PORT}`);
  console.log(`[API Gateway] Services:`, SERVICES);
});
