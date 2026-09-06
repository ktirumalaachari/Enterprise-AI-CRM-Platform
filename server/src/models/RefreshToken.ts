import { Schema, model, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByToken?: string;
  isExpired: boolean;
  isActive: boolean;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
    },
    replacedByToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual properties
refreshTokenSchema.virtual('isExpired').get(function (this: IRefreshToken) {
  return Date.now() >= this.expiresAt.getTime();
});

refreshTokenSchema.virtual('isActive').get(function (this: IRefreshToken) {
  return !this.revokedAt && !this.isExpired;
});

// Configure schemas to include virtuals when converting to JSON/Object
refreshTokenSchema.set('toJSON', { virtuals: true });
refreshTokenSchema.set('toObject', { virtuals: true });

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
