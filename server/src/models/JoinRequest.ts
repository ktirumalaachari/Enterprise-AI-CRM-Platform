import { Schema, model, Document, Types } from 'mongoose';

export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IJoinRequest extends Document {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  email: string;
  name: string;
  status: JoinRequestStatus;
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const joinRequestSchema = new Schema<IJoinRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate pending requests: one user can only have one PENDING request per company
joinRequestSchema.index(
  { userId: 1, companyId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'PENDING' },
  }
);

export const JoinRequest = model<IJoinRequest>('JoinRequest', joinRequestSchema);
export default JoinRequest;
