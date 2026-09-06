import rateLimit from 'express-rate-limit';

// General API rate limiter — generous for local dev, avoids 429 from normal navigation
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1-minute window
  max: 500,                  // 500 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for local development
    const ip = req.ip || req.socket.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
  message: {
    status: 429,
    message: 'Too many requests. Please slow down.',
  },
});

// Auth rate limiter — more lenient to prevent false positives during dev
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 100,                  // 100 attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || req.socket.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
  message: {
    status: 429,
    message: 'Too many login attempts. Try again later.',
  },
});

// AI endpoint rate limiter — reasonable for local dev usage
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || req.socket.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
  message: {
    status: 429,
    message: 'AI request limit reached. Please wait before making more AI requests.',
  },
});
