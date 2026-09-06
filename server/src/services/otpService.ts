import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import PasswordResetOTP from '../models/PasswordResetOTP';

// ─── Constants ────────────────────────────────────────────────────────────────

/** OTP validity window: 2 minutes */
const OTP_EXPIRY_MS = 2 * 60 * 1000;

/** Minimum time between resend requests: 60 seconds */
const RESEND_COOLDOWN_MS = 60 * 1000;

/** Maximum verification attempts before OTP is invalidated */
const MAX_ATTEMPTS = 5;

/** Password-reset token validity: 10 minutes (enough time to fill the form) */
const RESET_TOKEN_EXPIRY = '10m';

/** Purpose claim enforced in the password-reset JWT */
const RESET_TOKEN_PURPOSE = 'password-reset';

// ─── OTP Service ──────────────────────────────────────────────────────────────

/**
 * OTPService — handles OTP generation, hashing, verification, and cleanup.
 * OTPs are ONLY used for the Forgot Password flow.
 * This service must never be adapted for login, registration, or any other purpose.
 */
export class OTPService {
  // ─── Generation ─────────────────────────────────────────────────────────────

  /**
   * Generate a cryptographically secure 6-digit numeric OTP.
   */
  static generateOTP(): string {
    const min = 100000;
    const max = 999999;
    const range = max - min + 1;
    const randomBytes = crypto.randomBytes(4);
    const randomValue = randomBytes.readUInt32BE(0) % range;
    return String(min + randomValue);
  }

  /**
   * Hash OTP using bcrypt for secure storage.
   * Plain OTP is never stored in the database.
   */
  static async hashOTP(otp: string): Promise<string> {
    return await bcrypt.hash(otp, 10);
  }

  /**
   * Compare a plain OTP against a bcrypt hash.
   */
  static async verifyOTPHash(plainOTP: string, hashedOTP: string): Promise<boolean> {
    return await bcrypt.compare(plainOTP, hashedOTP);
  }

  // ─── Create / Resend ────────────────────────────────────────────────────────

  /**
   * Create and store a new OTP for forgot-password flow.
   * Enforces a 60-second resend cooldown.
   *
   * @param userId - MongoDB user ID
   * @param email  - Normalized (lowercase) email address
   * @returns Plain-text OTP (must be emailed and NEVER stored)
   * @throws Error with user-facing message if cooldown is active
   */
  static async createOTP(userId: string, email: string): Promise<string> {
    // Check for an existing active OTP (cooldown enforcement)
    const existingOTP = await PasswordResetOTP.findOne({ email });

    if (existingOTP) {
      const now = Date.now();
      const timeSinceLastSent = now - existingOTP.lastSentAt.getTime();

      if (timeSinceLastSent < RESEND_COOLDOWN_MS) {
        const secondsRemaining = Math.ceil(
          (RESEND_COOLDOWN_MS - timeSinceLastSent) / 1000
        );
        throw new Error(
          `Please wait ${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''} before requesting a new code.`
        );
      }

      // Cooldown passed — delete the old OTP before creating a new one
      await PasswordResetOTP.deleteOne({ _id: existingOTP._id });
    }

    // Generate new OTP
    const otp = this.generateOTP();
    const otpHash = await this.hashOTP(otp);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);

    await PasswordResetOTP.create({
      userId,
      email,
      otpHash,
      attempts: 0,
      expiresAt,
      lastSentAt: now,
    });

    // Return plain OTP ONLY for emailing — it is never stored in plain form
    return otp;
  }

  // ─── Validation ─────────────────────────────────────────────────────────────

  /**
   * Validate a submitted OTP for forgot-password.
   * On success: the OTP record is deleted immediately.
   * On failure: attempt count is incremented; record deleted after MAX_ATTEMPTS.
   */
  static async validateOTP(
    email: string,
    plainOTP: string
  ): Promise<{ valid: boolean; error?: string }> {
    // Find OTP record for this email
    const otpRecord = await PasswordResetOTP.findOne({ email });

    if (!otpRecord) {
      return {
        valid: false,
        error: 'No active verification code found. Please request a new code.',
      };
    }

    // Check expiration
    if (otpRecord.expiresAt < new Date()) {
      await PasswordResetOTP.deleteOne({ _id: otpRecord._id });
      return {
        valid: false,
        error: 'Verification code has expired. Please request a new code.',
      };
    }

    // Check if maximum attempts already reached
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await PasswordResetOTP.deleteOne({ _id: otpRecord._id });
      return {
        valid: false,
        error: 'Maximum verification attempts exceeded. Please request a new code.',
      };
    }

    // Increment attempt count before comparing (prevents timing-based enumeration)
    otpRecord.attempts += 1;
    await otpRecord.save();

    // Constant-time hash comparison
    const isValid = await this.verifyOTPHash(plainOTP, otpRecord.otpHash);

    if (!isValid) {
      const remainingAttempts = MAX_ATTEMPTS - otpRecord.attempts;

      if (remainingAttempts <= 0) {
        await PasswordResetOTP.deleteOne({ _id: otpRecord._id });
        return {
          valid: false,
          error: 'Maximum verification attempts exceeded. Please request a new code.',
        };
      }

      return {
        valid: false,
        error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
      };
    }

    // OTP is valid — delete it immediately (single-use)
    await PasswordResetOTP.deleteOne({ _id: otpRecord._id });

    return { valid: true };
  }

  // ─── Password-Reset Token ───────────────────────────────────────────────────

  /**
   * Issue a short-lived signed JWT authorizing a single password reset.
   *
   * This token:
   *  - Is tied to the verified email address
   *  - Has purpose = "password-reset" (never grants CRM/dashboard access)
   *  - Expires in 10 minutes
   *  - Must be presented to the reset-password endpoint
   *  - Is NOT a normal access token or refresh token
   */
  static generatePasswordResetToken(email: string): string {
    const secret = process.env.JWT_SECRET || 'fallback_access_secret_123';
    return jwt.sign(
      {
        email,
        purpose: RESET_TOKEN_PURPOSE,
      },
      secret,
      { expiresIn: RESET_TOKEN_EXPIRY }
    );
  }

  /**
   * Verify a password-reset token issued by generatePasswordResetToken().
   *
   * @returns The verified email if the token is valid and has the correct purpose.
   * @returns null if the token is invalid, expired, or has the wrong purpose.
   */
  static verifyPasswordResetToken(token: string): string | null {
    try {
      const secret = process.env.JWT_SECRET || 'fallback_access_secret_123';
      const decoded = jwt.verify(token, secret) as {
        email?: string;
        purpose?: string;
      };

      // Strictly enforce purpose — this token must NEVER be used for login or other flows
      if (!decoded.email || decoded.purpose !== RESET_TOKEN_PURPOSE) {
        return null;
      }

      return decoded.email;
    } catch {
      return null;
    }
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  /**
   * Manually delete an OTP record for a given email.
   * (MongoDB TTL will also clean up automatically, but this is for explicit deletion.)
   */
  static async deleteOTP(email: string): Promise<void> {
    await PasswordResetOTP.deleteMany({ email });
  }

  /**
   * Remove all expired OTPs (MongoDB TTL handles this automatically,
   * but can be called manually if needed).
   */
  static async cleanupExpiredOTPs(): Promise<void> {
    await PasswordResetOTP.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }
}

export default OTPService;
