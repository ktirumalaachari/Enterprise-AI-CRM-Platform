import { Request, Response } from 'express';
import { z } from 'zod';
import Package, { seedDefaultPackages } from '../models/Package';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { LoggerService } from '../services/loggerService';

const packageSchema = z.object({
  name: z.string().min(2, 'Package name must be at least 2 characters'),
  slug: z.string().min(2, 'Package slug is required'),
  description: z.string().optional().default(''),
  monthlyPrice: z.number().min(0, 'Monthly price cannot be negative'),
  yearlyPrice: z.number().min(0, 'Yearly price cannot be negative'),
  currency: z.string().default('INR'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).default('ACTIVE'),
  displayOrder: z.number().default(0),
  limits: z.object({
    maxSalesManagers: z.number().min(0).default(5),
    maxSalesReps: z.number().min(0).default(20),
    maxTotalUsers: z.number().min(1).default(25),
    maxLeads: z.number().min(0).default(5000),
    maxCustomers: z.number().min(0).default(1000),
    maxDeals: z.number().min(0).default(1000),
    aiQueryLimit: z.number().min(0).default(1000),
    storageLimitMb: z.number().min(0).default(5000),
  }),
  aiFeatures: z.object({
    emailGenerator: z.boolean().default(true),
    followupGenerator: z.boolean().default(true),
    meetingSummary: z.boolean().default(false),
    copilotChat: z.boolean().default(false),
    leadAnalysis: z.boolean().default(false),
    salesAssistance: z.boolean().default(false),
  }),
});

/** GET /api/packages — Public/User active packages endpoint */
export const getAllPackages = async (_req: Request, res: Response): Promise<void> => {
  try {
    let packages = await Package.find({ status: 'ACTIVE' }).sort({ displayOrder: 1, createdAt: 1 });
    if (!packages || packages.length === 0) {
      await seedDefaultPackages();
      packages = await Package.find({ status: 'ACTIVE' }).sort({ displayOrder: 1, createdAt: 1 });
    }
    res.status(200).json({ success: true, packages });
  } catch (error: any) {
    console.error('[PackageController] Error fetching packages:', error.message);
    // Fallback to static packages to prevent 500 frontend errors
    const fallbackPackages = [
      {
        _id: 'default-trial',
        name: 'Trial',
        slug: 'trial',
        description: '14-day free trial with basic CRM access and 100 AI credits.',
        monthlyPrice: 0,
        yearlyPrice: 0,
        currency: 'INR',
        status: 'ACTIVE',
        displayOrder: 1,
        limits: { maxSalesManagers: 2, maxSalesReps: 5, maxTotalUsers: 7, maxLeads: 500, maxCustomers: 100, maxDeals: 100, aiQueryLimit: 100 },
        aiFeatures: { emailGenerator: true, followupGenerator: true, meetingSummary: false, copilotChat: false, leadAnalysis: false, salesAssistance: false },
      },
      {
        _id: 'default-basic',
        name: 'Starter',
        slug: 'basic',
        description: 'Essential CRM package for small sales teams.',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        currency: 'INR',
        status: 'ACTIVE',
        displayOrder: 2,
        limits: { maxSalesManagers: 3, maxSalesReps: 10, maxTotalUsers: 13, maxLeads: 2000, maxCustomers: 500, maxDeals: 500, aiQueryLimit: 500 },
        aiFeatures: { emailGenerator: true, followupGenerator: true, meetingSummary: true, copilotChat: false, leadAnalysis: false, salesAssistance: false },
      },
      {
        _id: 'default-medium',
        name: 'Professional',
        slug: 'medium',
        description: 'Comprehensive AI power tools for growing companies.',
        monthlyPrice: 2499,
        yearlyPrice: 24990,
        currency: 'INR',
        status: 'ACTIVE',
        displayOrder: 3,
        limits: { maxSalesManagers: 10, maxSalesReps: 40, maxTotalUsers: 50, maxLeads: 10000, maxCustomers: 2500, maxDeals: 2500, aiQueryLimit: 2500 },
        aiFeatures: { emailGenerator: true, followupGenerator: true, meetingSummary: true, copilotChat: true, leadAnalysis: true, salesAssistance: true },
      },
      {
        _id: 'default-premium',
        name: 'Enterprise Premium',
        slug: 'premium',
        description: 'Unlimited AI capabilities and high-capacity limits.',
        monthlyPrice: 4999,
        yearlyPrice: 49990,
        currency: 'INR',
        status: 'ACTIVE',
        displayOrder: 4,
        limits: { maxSalesManagers: 50, maxSalesReps: 200, maxTotalUsers: 250, maxLeads: 50000, maxCustomers: 10000, maxDeals: 10000, aiQueryLimit: 10000 },
        aiFeatures: { emailGenerator: true, followupGenerator: true, meetingSummary: true, copilotChat: true, leadAnalysis: true, salesAssistance: true },
      },
    ];
    res.status(200).json({ success: true, packages: fallbackPackages });
  }
};

/** GET /api/packages/admin — Super Admin all packages endpoint */
export const getAdminPackages = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const packages = await Package.find({}).sort({ displayOrder: 1, createdAt: 1 });
    res.status(200).json({ success: true, packages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin packages', error: error.message });
  }
};

/** POST /api/packages — Super Admin create package */
export const createPackage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const validation = packageSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Package validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, slug } = validation.data;

    // Check duplicate name or slug
    const existing = await Package.findOne({ $or: [{ name }, { slug }] });
    if (existing) {
      res.status(400).json({ success: false, message: 'A package with this name or slug already exists.' });
      return;
    }

    const newPackage = await Package.create(validation.data);

    if (req.user) {
      await LoggerService.log(req.user.id, 'PACKAGE_CREATE', {
        packageId: newPackage.id,
        packageName: newPackage.name,
        monthlyPrice: newPackage.monthlyPrice,
        yearlyPrice: newPackage.yearlyPrice,
      });
    }

    res.status(201).json({ success: true, message: 'Package created successfully', package: newPackage });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create package', error: error.message });
  }
};

/** PUT /api/packages/:id — Super Admin update package */
export const updatePackage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pkg = await Package.findById(id);
    if (!pkg) {
      res.status(404).json({ success: false, message: 'Package not found' });
      return;
    }

    const validation = packageSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Package validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const oldPrice = `${pkg.monthlyPrice}/${pkg.yearlyPrice}`;
    Object.assign(pkg, validation.data);
    await pkg.save();

    if (req.user) {
      await LoggerService.log(req.user.id, 'PACKAGE_UPDATE', {
        packageId: pkg.id,
        packageName: pkg.name,
        previousPricing: oldPrice,
        newPricing: `${pkg.monthlyPrice}/${pkg.yearlyPrice}`,
      });
    }

    res.status(200).json({ success: true, message: 'Package updated successfully', package: pkg });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update package', error: error.message });
  }
};

/** PATCH /api/packages/:id/status — Super Admin update package status */
export const updatePackageStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid package status.' });
      return;
    }

    const pkg = await Package.findByIdAndUpdate(id, { status }, { new: true });
    if (!pkg) {
      res.status(404).json({ success: false, message: 'Package not found' });
      return;
    }

    if (req.user) {
      await LoggerService.log(req.user.id, 'PACKAGE_STATUS_CHANGE', {
        packageId: pkg.id,
        packageName: pkg.name,
        newStatus: status,
      });
    }

    res.status(200).json({ success: true, message: `Package status set to ${status}`, package: pkg });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update package status', error: error.message });
  }
};
