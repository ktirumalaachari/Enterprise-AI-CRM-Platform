import { Schema, model, Document, Types } from 'mongoose';

export interface ISubscriptionHistory extends Document {
  companyId: Types.ObjectId;
  packageId?: Types.ObjectId;
  packageName: string;
  billingCycle: 'monthly' | 'yearly' | 'trial';
  amountPaid: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  paymentReference?: string;
  changedBy?: Types.ObjectId;
  createdAt: Date;
}

const subscriptionHistorySchema = new Schema<ISubscriptionHistory>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
    },
    packageName: {
      type: String,
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly', 'trial'],
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    paymentReference: {
      type: String,
      default: '',
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const SubscriptionHistory = model<ISubscriptionHistory>('SubscriptionHistory', subscriptionHistorySchema);
export default SubscriptionHistory;
