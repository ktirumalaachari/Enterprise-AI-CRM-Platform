import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Password Reset OTP Schema
 * Stores OTP hashes for password reset functionality ONLY.
 * Automatically expires via MongoDB TTL index.
 * Purpose is always "forgot-password" — this model is never reused for other flows.
 */
export interface IPasswordResetOTP extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  otpHash: string;
  attempts: number;
  expiresAt: Date;
  lastSentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetOTPSchema: Schema<IPasswordResetOTP> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '2m' }, // TTL Index: MongoDB auto-deletes documents 2 minutes after expiresAt
    },
    lastSentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookups by email
PasswordResetOTPSchema.index({ email: 1 });

// Unique index — only one active OTP allowed per email at a time
PasswordResetOTPSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { expiresAt: { $exists: true } } }
);

const PasswordResetOTP: Model<IPasswordResetOTP> =
  mongoose.models.PasswordResetOTP ||
  mongoose.model<IPasswordResetOTP>('PasswordResetOTP', PasswordResetOTPSchema);

export default PasswordResetOTP;
