import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { RefreshToken } from '../models/RefreshToken';
import { Types } from 'mongoose';

export interface TokenPayload {
  id: string;
  role: string;
  companyId?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  id?: string;
}

export class TokenService {
  private static getAccessSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET or JWT_ACCESS_SECRET environment variable is required in production');
      }
      return 'fallback_access_secret_123';
    }
    return secret;
  }

  private static getRefreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_REFRESH_SECRET environment variable is required in production');
      }
      return 'fallback_refresh_secret_456';
    }
    return secret;
  }

  // Generate Access Token (JWT)
  static generateAccessToken(payload: TokenPayload): string {
    const secret = this.getAccessSecret();
    const expiresIn = process.env.ACCESS_TOKEN_EXPIRY || '15m';
    
    return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
  }

  // Generate Refresh Token (JWT + optional DB tracking)
  static async generateRefreshToken(userId: string): Promise<string> {
    const secret = this.getRefreshSecret();
    const rawExpiry = process.env.REFRESH_TOKEN_EXPIRES_IN || process.env.REFRESH_TOKEN_EXPIRY || '7d';
    const expiresIn = rawExpiry.includes('d') || rawExpiry.includes('m') || rawExpiry.includes('h') ? rawExpiry : `${rawExpiry}d`;
    
    const token = jwt.sign({ userId, id: userId }, secret, { expiresIn: expiresIn as any });

    const expiryDays = parseInt(String(rawExpiry).replace(/[^0-9]/g, ''), 10) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    try {
      // Store in MongoDB for optional revocation tracking
      await RefreshToken.create({
        userId: new Types.ObjectId(userId),
        token,
        expiresAt,
      });
    } catch (err: any) {
      // Non-fatal: if DB insert fails due to transient error, JWT signature remains cryptographically verifiable
      console.warn('[AUTH] Refresh token DB record creation notice:', err.message);
    }

    return token;
  }

  // Verify refresh token (JWT)
  static verifyRefreshToken(token: string): RefreshTokenPayload | null {
    const secret = this.getRefreshSecret();
    try {
      const decoded = jwt.verify(token, secret) as RefreshTokenPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  // Set HTTP-only secure cookie
  static setRefreshTokenCookie(res: Response, token: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const rawExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7';
    const expiryDays = Math.max(1, parseInt(String(rawExpiry).replace(/[^0-9]/g, ''), 10) || 7);
    
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: expiryDays * 24 * 60 * 60 * 1000, // in ms
      path: '/api/auth', // Scoped to auth endpoints
    });
  }

  // Clear HTTP-only secure cookie
  static clearRefreshTokenCookie(res: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const options = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
    };

    res.clearCookie('refreshToken', { ...options, path: '/api/auth' });
    // Also clear root path cookie for backwards compatibility
    res.clearCookie('refreshToken', { ...options, path: '/' });
  }

  // Verify access token
  static verifyAccessToken(token: string): TokenPayload | null {
    const secret = this.getAccessSecret();
    try {
      return jwt.verify(token, secret) as TokenPayload;
    } catch {
      return null;
    }
  }
}

