// Load environment variables first, before any other imports
import dotenv from 'dotenv';
import dns from 'dns';

// Set public DNS resolvers ONLY in local environment
if (!process.env.VERCEL && !process.env.NOW_REGION) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch {
    // Ignore if restricted
  }
}

dotenv.config();

import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Vercel Serverless Function — wraps the Express app.
 *
 * Singleton DB connection pattern:
 *   Vercel reuses warm Lambda containers between requests.
 *   We ensure connectDB() is called on container initialization.
 *
 * Path Restoration:
 *   When Vercel rewrites /api/auth/login → /api/index, the Express app
 *   sees req.url as /api/index. We restore the original URL from
 *   x-matched-path or x-invoke-path headers that Vercel injects.
 */
let app: ((req: IncomingMessage, res: ServerResponse, next?: () => void) => void) | null = null;

/**
 * Lazily initialise the Express app and DB on the first request.
 * Dynamic imports prevent module-level errors from killing cold starts.
 */
async function bootstrap(): Promise<typeof app> {
  // Ensure DB connection is active
  try {
    const { connectDB } = await import('../server/src/config/db');
    await connectDB();
  } catch (err) {
    console.error('[Vercel Bootstrap Error] MongoDB connection failed:', err);
  }

  if (app) return app;

  // Import the Express app after env + DB are ready
  const { default: expressApp } = await import('../server/src/app');
  app = expressApp as typeof app;
  return app;
}

/**
 * Main Vercel handler — receives every request routed to /api/*
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // ── Handle OPTIONS preflight for CORS ─────────────────────────────────────
  if (req.method === 'OPTIONS') {
    const origin = (req.headers.origin as string) || '';
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization,Content-Type,Cookie,X-Requested-With',
      'Access-Control-Max-Age': '86400',
    };

    if (origin) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
    } else {
      headers['Access-Control-Allow-Origin'] = '*';
    }

    res.writeHead(204, headers);
    res.end();
    return;
  }

  // ── Restore original URL (Vercel rewrites /api/auth/login → /api/index) ──
  // Vercel injects the original path in x-matched-path or x-invoke-path headers.
  const originalPath =
    (req.headers['x-matched-path'] as string) ||
    (req.headers['x-invoke-path'] as string) ||
    req.url;

  if (originalPath && originalPath !== req.url) {
    (req as any).url = originalPath;
  }

  const expressApp = await bootstrap();

  if (!expressApp) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Server initialisation failed.' }));
    return;
  }

  return new Promise<void>((resolve, reject) => {
    (expressApp as any)(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
