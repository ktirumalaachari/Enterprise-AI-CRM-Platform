import { Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import User from '../models/User';
import Company from '../models/Company';
import Package from '../models/Package';
import { Payment } from '../models/Payment';
import SubscriptionHistory from '../models/SubscriptionHistory';
import SubscriptionService, { PLANS } from '../services/subscriptionService';

/**
 * Returns a Razorpay SDK instance using server-side credentials.
 */
const getRazorpayInstance = (): Razorpay => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay credentials missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env.'
    );
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

/**
 * POST /api/payments/create-order
 * Creates Razorpay order using dynamic Package DB prices or fallback config.
 */
export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { plan, billingCycle = 'monthly' } = req.body;

    if (!plan) {
      res.status(400).json({ success: false, message: 'Package/Plan is required.' });
      return;
    }

    // Dynamic Package lookup from DB
    let dbPackage = await Package.findOne({ slug: plan, status: 'ACTIVE' });
    if (!dbPackage) {
      dbPackage = await Package.findById(plan);
    }

    let amountPaise = 0;
    let planPrice = 0;
    let planName = plan;

    if (dbPackage) {
      planName = dbPackage.name;
      planPrice = billingCycle === 'yearly' ? dbPackage.yearlyPrice : dbPackage.monthlyPrice;
      amountPaise = planPrice * 100;
    } else if (PLANS[plan]) {
      const planConfig = PLANS[plan];
      planPrice = planConfig.price;
      amountPaise = planConfig.amountPaise;
      planName = planConfig.name;
    } else {
      res.status(400).json({ success: false, message: 'Invalid or inactive subscription plan.' });
      return;
    }

    if (amountPaise <= 0) {
      res.status(400).json({ success: false, message: 'This plan does not require online payment.' });
      return;
    }

    let razorpay: Razorpay;
    try {
      razorpay = getRazorpayInstance();
    } catch (credErr: any) {
      res.status(503).json({
        success: false,
        message: 'Payment gateway is not configured. Please contact the administrator.',
      });
      return;
    }

    const orderOptions = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `rcpt_${req.user.id.slice(-8)}_${Date.now()}`,
      notes: {
        userId: req.user.id,
        plan,
        planName,
        billingCycle,
      },
    };

    const razorpayOrder: any = await razorpay.orders.create(orderOptions);

    await Payment.create({
      userId: req.user.id,
      plan,
      amount: planPrice,
      currency: 'INR',
      razorpayOrderId: razorpayOrder.id,
      status: 'created',
    });

    res.status(200).json({
      success: true,
      order: razorpayOrder,
      key: process.env.RAZORPAY_KEY_ID,
      amount: amountPaise,
      plan,
      planName,
    });
  } catch (err: any) {
    console.error('[PAYMENT] createOrder unexpected error:', err?.message || err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while creating the order.',
    });
  }
};

/**
 * POST /api/payments/verify
 * Verifies Razorpay payment signature & updates company active subscription & history.
 */
export const verifyPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, billingCycle = 'monthly' } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      res.status(400).json({
        success: false,
        message: 'Missing payment verification fields.',
      });
      return;
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      res.status(503).json({ success: false, message: 'Payment verification unavailable.' });
      return;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'failed', razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature }
      );
      res.status(400).json({ success: false, message: 'Invalid payment signature.' });
      return;
    }

    const paymentRecord = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: 'paid', razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature },
      { new: true }
    );

    // Find DB Package if available
    let dbPackage = await Package.findOne({ slug: plan });
    if (!dbPackage) {
      dbPackage = await Package.findById(plan);
    }

    const startDate = new Date();
    const durationMonths = billingCycle === 'yearly' ? 12 : (dbPackage?.limits ? 1 : 3);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const activeCompanyId = req.companyId || req.user.companyId;

    if (activeCompanyId) {
      const company = await Company.findById(activeCompanyId);
      if (company) {
        company.subscription = {
          packageId: dbPackage?._id as any,
          plan: dbPackage?.name || plan,
          status: 'active',
          billingCycle: billingCycle as any,
          amountPaid: paymentRecord?.amount || (dbPackage ? (billingCycle === 'yearly' ? dbPackage.yearlyPrice : dbPackage.monthlyPrice) : 0),
          startDate,
          endDate,
          renewalDate: endDate,
          autoRenew: true,
          aiFeaturesEnabled: true,
          currentAiUsage: 0,
          usageLimits: {
            maxSalesManagers: dbPackage?.limits?.maxSalesManagers || 5,
            maxSalesReps: dbPackage?.limits?.maxSalesReps || 20,
            maxUsers: dbPackage?.limits?.maxTotalUsers || 25,
            maxLeads: dbPackage?.limits?.maxLeads || 5000,
            maxCustomers: dbPackage?.limits?.maxCustomers || 1000,
            maxDeals: dbPackage?.limits?.maxDeals || 1000,
            aiQueryLimit: dbPackage?.limits?.aiQueryLimit || 1000,
          },
        };
        await company.save();

        // Save Subscription History
        await SubscriptionHistory.create({
          companyId: company._id,
          packageId: dbPackage?._id,
          packageName: dbPackage?.name || plan,
          billingCycle,
          amountPaid: company.subscription.amountPaid,
          currency: dbPackage?.currency || 'INR',
          startDate,
          endDate,
          paymentReference: razorpay_payment_id,
          changedBy: req.user.id,
        });
      }
    }

    // Also update User subscription field for backward compatibility
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        'subscription.plan': plan,
        'subscription.status': 'active',
        'subscription.startDate': startDate,
        'subscription.endDate': endDate,
      },
      { new: true }
    );

    const subscriptionStatus = SubscriptionService.getSubscriptionStatus(updatedUser!);

    res.status(200).json({
      success: true,
      message: `Payment verified. Subscription active until ${endDate.toLocaleDateString()}!`,
      subscription: subscriptionStatus,
    });
  } catch (err: any) {
    console.error('[PAYMENT VERIFY] Error:', err?.message || err);
    res.status(500).json({ success: false, message: 'An unexpected error occurred.' });
  }
};

/**
 * GET /api/payments/subscription-status
 */
export const getSubscriptionStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const subscriptionStatus = SubscriptionService.getSubscriptionStatus(user);
    res.status(200).json({ success: true, subscription: subscriptionStatus });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch subscription status.' });
  }
};

/**
 * POST /api/payments/webhook
 * Razorpay webhook handler for server-to-server notifications.
 */
export const handleWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'] as string;
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        res.status(400).json({ status: 'error', message: 'Invalid webhook signature' });
        return;
      }
    }

    const event = req.body?.event;
    if (event === 'payment.captured') {
      const paymentEntity = req.body?.payload?.payment?.entity;
      if (paymentEntity?.order_id) {
        await Payment.findOneAndUpdate(
          { razorpayOrderId: paymentEntity.order_id },
          { status: 'paid', razorpayPaymentId: paymentEntity.id }
        );
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
