import { Schema, model, Document, Types } from 'mongoose';

export type CompanyStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
export type SubscriptionPlan = 'trial' | 'basic' | 'medium' | 'premium' | string;
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'suspended' | 'cancelled' | 'payment_pending';
export type BillingCycle = 'monthly' | 'yearly' | 'trial';

export interface ICompany extends Document {
  companyName: string;
  ownerId: Types.ObjectId;
  businessEmail: string;
  phone?: string;
  industry?: string;
  companySize?: string;
  country?: string;
  state?: string;
  city?: string;
  website?: string;
  status: CompanyStatus;
  rejectionReason?: string;
  joinCode?: string;
  joinCodeActive: boolean;
  joinCodeGeneratedAt?: Date;
  subscription: {
    packageId?: Types.ObjectId;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
    amountPaid: number;
    startDate?: Date;
    endDate?: Date;
    trialStartDate?: Date;
    trialEndDate?: Date;
    renewalDate?: Date;
    autoRenew: boolean;
    aiFeaturesEnabled: boolean;
    currentAiUsage: number;
    usageLimits?: {
      maxSalesManagers?: number;
      maxSalesReps?: number;
      maxUsers?: number;
      maxLeads?: number;
      maxCustomers?: number;
      maxDeals?: number;
      aiQueryLimit?: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
    },
    businessEmail: {
      type: String,
      required: [true, 'Business email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    industry: {
      type: String,
      default: 'Technology',
      trim: true,
    },
    companySize: {
      type: String,
      default: '1-10',
      trim: true,
    },
    country: {
      type: String,
      default: '',
      trim: true,
    },
    state: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    website: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    joinCode: {
      type: String,
      sparse: true,
      index: true,
    },
    joinCodeActive: {
      type: Boolean,
      default: false,
    },
    joinCodeGeneratedAt: {
      type: Date,
    },
    subscription: {
      packageId: {
        type: Schema.Types.ObjectId,
        ref: 'Package',
      },
      plan: {
        type: String,
        default: 'trial',
      },
      status: {
        type: String,
        enum: ['trial', 'active', 'expired', 'suspended', 'cancelled', 'payment_pending'],
        default: 'trial',
      },
      billingCycle: {
        type: String,
        enum: ['monthly', 'yearly', 'trial'],
        default: 'trial',
      },
      amountPaid: {
        type: Number,
        default: 0,
      },
      startDate: { type: Date, default: Date.now },
      endDate: { type: Date },
      trialStartDate: { type: Date, default: Date.now },
      trialEndDate: {
        type: Date,
        default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      renewalDate: { type: Date },
      autoRenew: { type: Boolean, default: true },
      aiFeaturesEnabled: { type: Boolean, default: true },
      currentAiUsage: { type: Number, default: 0 },
      usageLimits: {
        maxSalesManagers: { type: Number, default: 5 },
        maxSalesReps: { type: Number, default: 20 },
        maxUsers: { type: Number, default: 25 },
        maxLeads: { type: Number, default: 5000 },
        maxCustomers: { type: Number, default: 1000 },
        maxDeals: { type: Number, default: 1000 },
        aiQueryLimit: { type: Number, default: 1000 },
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Company = model<ICompany>('Company', companySchema);
export default Company;
