import { Schema, model, Document } from 'mongoose';

export type PackageStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface IAIFeatureToggles {
  emailGenerator: boolean;
  followupGenerator: boolean;
  meetingSummary: boolean;
  copilotChat: boolean;
  leadAnalysis: boolean;
  salesAssistance: boolean;
}

export interface IPackageLimits {
  maxSalesManagers: number;
  maxSalesReps: number;
  maxTotalUsers: number;
  maxLeads: number;
  maxCustomers: number;
  maxDeals: number;
  aiQueryLimit: number;
  storageLimitMb?: number;
}

export interface IPackage extends Document {
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number; // in INR / primary currency
  yearlyPrice: number;  // in INR / primary currency
  currency: string;
  status: PackageStatus;
  displayOrder: number;
  limits: IPackageLimits;
  aiFeatures: IAIFeatureToggles;
  createdAt: Date;
  updatedAt: Date;
}

const packageSchema = new Schema<IPackage>(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    monthlyPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    yearlyPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    limits: {
      maxSalesManagers: { type: Number, default: 5 },
      maxSalesReps: { type: Number, default: 20 },
      maxTotalUsers: { type: Number, default: 25 },
      maxLeads: { type: Number, default: 5000 },
      maxCustomers: { type: Number, default: 1000 },
      maxDeals: { type: Number, default: 1000 },
      aiQueryLimit: { type: Number, default: 1000 },
      storageLimitMb: { type: Number, default: 5000 },
    },
    aiFeatures: {
      emailGenerator: { type: Boolean, default: true },
      followupGenerator: { type: Boolean, default: true },
      meetingSummary: { type: Boolean, default: false },
      copilotChat: { type: Boolean, default: false },
      leadAnalysis: { type: Boolean, default: false },
      salesAssistance: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

export const Package = model<IPackage>('Package', packageSchema);
export default Package;

/** Seed default packages into DB if none exist */
export const seedDefaultPackages = async () => {
  try {
    const count = await Package.countDocuments();
    if (count > 0) return;

    const defaults = [
      {
        name: 'Trial',
        slug: 'trial',
        description: '14-day free trial with basic CRM access and 100 AI credits.',
        monthlyPrice: 0,
        yearlyPrice: 0,
        currency: 'INR',
        status: 'ACTIVE',
        displayOrder: 1,
        limits: {
          maxSalesManagers: 2,
          maxSalesReps: 5,
          maxTotalUsers: 7,
          maxLeads: 500,
          maxCustomers: 100,
          maxDeals: 100,
          aiQueryLimit: 100,
          storageLimitMb: 1000,
        },
        aiFeatures: {
          emailGenerator: true,
          followupGenerator: true,
          meetingSummary: false,
          copilotChat: false,
          leadAnalysis: false,
          salesAssistance: false,
        },
      },
      {
        name: 'Starter',
        slug: 'basic',
        description: 'Essential CRM package for small sales teams.',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        currency: 'INR',
        status: 'ACTIVE',
        displayOrder: 2,
        limits: {
          maxSalesManagers: 3,
          maxSalesReps: 10,
          maxTotalUsers: 13,
          maxLeads: 2000,
          maxCustomers: 500,
          maxDeals: 500,
          aiQueryLimit: 500,
          storageLimitMb: 2000,
        },
        aiFeatures: {
          emailGenerator: true,
          followupGenerator: true,
          meetingSummary: true,
          copilotChat: false,
          leadAnalysis: false,
          salesAssistance: false,
        },
      },
      {
        name: 'Professional',
        slug: 'medium',
        description: 'Comprehensive AI power tools for growing companies.',
        monthlyPrice: 2499,
        yearlyPrice: 24990,
        currency: 'INR',
        status: 'ACTIVE',
        displayOrder: 3,
        limits: {
          maxSalesManagers: 10,
          maxSalesReps: 40,
          maxTotalUsers: 50,
          maxLeads: 10000,
          maxCustomers: 2500,
          maxDeals: 2500,
          aiQueryLimit: 2500,
          storageLimitMb: 10000,
        },
        aiFeatures: {
          emailGenerator: true,
          followupGenerator: true,
          meetingSummary: true,
          copilotChat: true,
          leadAnalysis: true,
          salesAssistance: true,
        },
      },
      {
        name: 'Enterprise Premium',
        slug: 'premium',
        description: 'Unlimited AI capabilities and high-capacity limits.',
        monthlyPrice: 4999,
        yearlyPrice: 49990,
        currency: 'INR',
        status: 'ACTIVE',
        displayOrder: 4,
        limits: {
          maxSalesManagers: 50,
          maxSalesReps: 200,
          maxTotalUsers: 250,
          maxLeads: 50000,
          maxCustomers: 10000,
          maxDeals: 10000,
          aiQueryLimit: 10000,
          storageLimitMb: 50000,
        },
        aiFeatures: {
          emailGenerator: true,
          followupGenerator: true,
          meetingSummary: true,
          copilotChat: true,
          leadAnalysis: true,
          salesAssistance: true,
        },
      },
    ];

    await Package.insertMany(defaults);
    console.log('[PACKAGE SEEDER] Successfully seeded 4 default packages.');
  } catch (err: any) {
    console.error('[PACKAGE SEEDER] Error seeding packages:', err.message);
  }
};
