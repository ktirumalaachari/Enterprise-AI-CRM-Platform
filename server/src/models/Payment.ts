import { Schema, model, Document } from 'mongoose';

export type PaymentStatus = 'created' | 'paid' | 'failed' | 'cancelled';
export type PlanType = 'basic' | 'medium' | 'premium';

export interface IPayment extends Document {
  userId: Schema.Types.ObjectId;
  plan: PlanType;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['basic', 'medium', 'premium'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },
    razorpaySignature: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'cancelled'],
      default: 'created',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Payment = model<IPayment>('Payment', paymentSchema);
