import dns from 'dns';
if (!process.env.VERCEL && !process.env.NOW_REGION) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch {
    // Ignore if restricted
  }
}

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import teamRoutes from './routes/teamRoutes';
import customerRoutes from './routes/customerRoutes';
import activityRoutes from './routes/activityRoutes';
import dealRoutes from './routes/dealRoutes';
import aiRoutes from './routes/aiRoutes';
import taskRoutes from './routes/taskRoutes';
import calendarRoutes from './routes/calendarRoutes';
import notificationRoutes from './routes/notificationRoutes';
import reportRoutes from './routes/reportRoutes';
import profileRoutes from './routes/profileRoutes';
import paymentRoutes from './routes/paymentRoutes';
import companyRoutes from './routes/companyRoutes';
import joinRequestRoutes from './routes/joinRequestRoutes';
import packageRoutes from './routes/packageRoutes';
import rbacRoutes from './routes/rbacRoutes';
import { apiLimiter, authLimiter, aiLimiter } from './middleware/rateLimiter';
import { connectDB } from './config/db';

const app = express();

// ─── Security Middlewares ─────────────────────────────────────────────────────

/**
 * Fix #3: COOP/COEP — allow Google OAuth popup window.postMessage
 * Default helmet() sets Cross-Origin-Opener-Policy: same-origin which blocks OAuth popups.
 * Using 'same-origin-allow-popups' fixes the COOP console warning while keeping security.
 */
app.use(
  helmet({
    crossOriginOpenerPolicy: false,     // Disabled to allow Razorpay Checkout & OAuth popup postMessage communication
    crossOriginEmbedderPolicy: false,   // Must be false for OAuth & Razorpay iframes/popups
    contentSecurityPolicy: false,        // CSP can be customized separately per deployment
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Id'],
  })
);


// ─── Body Parsers ─────────────────────────────────────────────────────────────

// JSON body limit — kept at 1mb for regular routes.
// Avatar uploads use multipart/form-data (Multer) so they bypass this limit.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ─── NoSQL Injection Protection ───────────────────────────────────────────────
// Sanitizes user-supplied data in req.body, req.query, req.params
app.use(mongoSanitize({ replaceWith: '_' }));

// ─── Database Readiness Middleware ───────────────────────────────────────────
// Ensures Mongoose DB connection is active before processing API requests
app.use('/api', async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('[Database Middleware Error]', err);
  }
  next();
});

// ─── Rate Limiters ────────────────────────────────────────────────────────────

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/ai', aiLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/rbac', rbacRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'AI CRM Backend Server is healthy.',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${_req.method} ${_req.originalUrl}`,
  });
});

// ─── Centralized Error Handler ────────────────────────────────────────────────

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // Log full error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[GlobalErrorHandler]', err);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors as Record<string, { message: string }>)
      .map((e) => e.message);
    res.status(400).json({ success: false, message: 'Validation failed', errors });
    return;
  }

  // Mongoose duplicate key (e.g. duplicate email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    res.status(400).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
    return;
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    res.status(400).json({ success: false, message: 'Invalid resource ID format.' });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, message: 'Invalid authentication token.' });
    return;
  }
  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Authentication token has expired.' });
    return;
  }

  // Multer errors (file upload)
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'Image exceeds the maximum allowed size of 5 MB.'
      : `Upload error: ${err.message}`;
    res.status(400).json({ success: false, message: msg });
    return;
  }

  // Generic fallback — never expose stack in production
  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again.'
    : err.message || 'Internal server error';

  res.status(statusCode).json({ success: false, message });
});

export default app;
