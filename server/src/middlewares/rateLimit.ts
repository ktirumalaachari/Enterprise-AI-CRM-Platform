import { Request, Response, NextFunction } from 'express';

/**
 * In-memory rate limiter for API endpoints
 * Prevents brute force attacks on sensitive endpoints
 */
interface RateLimitStore {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitStore> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get client identifier from request
   */
  private getClientId(req: Request): string {
    // Use IP address as identifier
    const ip = req.ip || 
                req.connection?.remoteAddress || 
                (req.socket as any)?.remoteAddress ||
                (req.connection as any)?.socket?.remoteAddress ||
                'unknown';
    return ip;
  }

  /**
   * Check if request should be rate limited
   */
  public checkLimit(req: Request): { allowed: boolean; remaining: number; resetTime: number } {
    const clientId = this.getClientId(req);
    const now = Date.now();
    
    const record = this.store.get(clientId);
    
    // If no record exists, create new one
    if (!record || now > record.resetTime) {
      this.store.set(clientId, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs,
      };
    }
    
    // Increment count
    record.count += 1;
    this.store.set(clientId, record);
    
    // Check if limit exceeded
    if (record.count > this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }
    
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Reset limit for a specific client (for testing)
   */
  public resetLimit(clientId: string): void {
    this.store.delete(clientId);
  }
}

/**
 * Rate limit middleware factory
 */
export const createRateLimiter = (windowMs: number, maxRequests: number) => {
  const limiter = new RateLimiter(windowMs, maxRequests);
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = limiter.checkLimit(req);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter,
      });
      return;
    }
    
    next();
  };
};

/**
 * Pre-configured rate limiters for different endpoints
 */
// Forgot Password: 5 requests per hour per IP
export const forgotPasswordRateLimit = createRateLimiter(60 * 60 * 1000, 5);

// OTP Verification: 10 requests per hour per IP
export const otpVerificationRateLimit = createRateLimiter(60 * 60 * 1000, 10);

// Reset Password: 3 requests per hour per IP
export const resetPasswordRateLimit = createRateLimiter(60 * 60 * 1000, 3);

export default RateLimiter;
