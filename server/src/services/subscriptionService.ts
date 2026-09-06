import { IUser } from '../models/User';

export interface PlanConfig {
  name: string;
  price: number; // in INR
  amountPaise: number; // for Razorpay
  durationMonths: number;
  durationDays: number;
  description: string;
}

export const PLANS: Record<string, PlanConfig> = {
  trial: {
    name: '14-Day Free Trial',
    price: 0,
    amountPaise: 0,
    durationMonths: 0,
    durationDays: 14,
    description: 'Full access to CRM & AI features for 14 days',
  },
  basic: {
    name: 'Basic',
    price: 200,
    amountPaise: 20000, // ₹200 = 20,000 paise
    durationMonths: 3,
    durationDays: 90,
    description: '3 months access to all CRM & premium AI features',
  },
  medium: {
    name: 'Medium',
    price: 400,
    amountPaise: 40000, // ₹400 = 40,000 paise
    durationMonths: 6,
    durationDays: 180,
    description: '6 months access to all CRM & premium AI features',
  },
  premium: {
    name: 'Premium',
    price: 800,
    amountPaise: 80000, // ₹800 = 80,000 paise
    durationMonths: 9,
    durationDays: 270,
    description: '9 months access to all CRM & premium AI features',
  },
};

export interface SubscriptionStatusResult {
  plan: 'trial' | 'basic' | 'medium' | 'premium';
  status: 'trial' | 'active' | 'expired';
  trialStartDate?: Date;
  trialEndDate?: Date;
  startDate?: Date;
  endDate?: Date;
  daysRemaining: number;
  aiAccess: boolean;
  message: string;
}

export class SubscriptionService {
  /**
   * Calculates the authoritative subscription status for a user based on backend time.
   */
  public static getSubscriptionStatus(user: IUser): SubscriptionStatusResult {
    const now = new Date();
    const roleNorm = (user.role || '').toString().toUpperCase();

    // Super Admin has lifetime Unlimited Premium Plan access across all features & tools
    if (roleNorm === 'SUPER_ADMIN' || roleNorm === 'SUPERADMIN' || (user as any).isSuperAdmin) {
      return {
        plan: 'premium',
        status: 'active',
        daysRemaining: 99999,
        aiAccess: true,
        message: 'Super Admin - Lifetime Premium Unlimited Access',
      };
    }

    const sub = (user.subscription || {}) as any;

    const plan = sub.plan || 'trial';
    const trialStartDate = sub.trialStartDate || user.createdAt || now;
    // Default trial duration is 14 days from account creation
    const trialEndDate = sub.trialEndDate || new Date(trialStartDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Paid Plan Active Check
    if (plan !== 'trial' && sub.endDate) {
      const endDate = new Date(sub.endDate);
      if (now <= endDate) {
        const diffMs = endDate.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        return {
          plan,
          status: 'active',
          startDate: sub.startDate,
          endDate: sub.endDate,
          trialStartDate,
          trialEndDate,
          daysRemaining,
          aiAccess: true,
          message: `${PLANS[plan]?.name || plan} plan active (${daysRemaining} days remaining)`,
        };
      } else {
        // Paid plan has expired
        return {
          plan,
          status: 'expired',
          startDate: sub.startDate,
          endDate: sub.endDate,
          trialStartDate,
          trialEndDate,
          daysRemaining: 0,
          aiAccess: false,
          message: `Your ${PLANS[plan]?.name || plan} plan has expired. Upgrade to unlock AI features.`,
        };
      }
    }

    // Trial Plan Check
    if (now <= trialEndDate) {
      const diffMs = trialEndDate.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        plan: 'trial',
        status: 'trial',
        trialStartDate,
        trialEndDate,
        daysRemaining,
        aiAccess: true,
        message: `14-Day Free Trial active (${daysRemaining} days remaining)`,
      };
    }

    // Trial has expired
    return {
      plan: 'trial',
      status: 'expired',
      trialStartDate,
      trialEndDate,
      daysRemaining: 0,
      aiAccess: false,
      message: 'Your 14-day free trial has ended. Upgrade your plan to unlock AI features.',
    };
  }

  /**
   * Calculates the end date for a paid plan starting from payment date.
   */
  public static calculatePaidEndDate(startDate: Date, plan: 'basic' | 'medium' | 'premium'): Date {
    const config = PLANS[plan];
    const months = config ? config.durationMonths : 3;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    return endDate;
  }
}

export default SubscriptionService;
