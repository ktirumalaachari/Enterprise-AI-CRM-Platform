import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import Company from '../models/Company';
import User from '../models/User';

export const requireTenant = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // SuperAdmin can access across tenants or manage platform
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'SuperAdmin') {
      next();
      return;
    }

    let companyId = req.user.companyId || req.companyId;

    if (!companyId && req.user.id) {
      const dbUser = await User.findById(req.user.id);
      if (dbUser?.companyId) {
        companyId = dbUser.companyId.toString();
      } else {
        const owned = await Company.findOne({ ownerId: req.user.id });
        if (owned) companyId = owned.id;
      }
      if (companyId) {
        req.user.companyId = companyId;
        req.companyId = companyId;
      }
    }

    if (!companyId) {
      res.status(400).json({
        success: false,
        message: 'No company is associated with your account.',
        code: 'NO_COMPANY',
      });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Associated company not found.',
        code: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    // Enforce Company Status
    if (company.status === 'PENDING') {
      res.status(403).json({
        success: false,
        message: 'Your company registration is pending approval.',
        status: 'PENDING',
        companyName: company.companyName,
      });
      return;
    }

    if (company.status === 'SUSPENDED') {
      res.status(403).json({
        success: false,
        message: 'Your company account is currently suspended. Please contact Super Admin.',
        status: 'SUSPENDED',
        companyName: company.companyName,
      });
      return;
    }

    if (company.status === 'REJECTED') {
      res.status(403).json({
        success: false,
        message: 'Your company registration has been rejected.',
        status: 'REJECTED',
        reason: company.rejectionReason || 'Registration did not meet criteria.',
        companyName: company.companyName,
      });
      return;
    }

    // Company is ACTIVE
    req.companyId = company.id;
    next();
  } catch (error: any) {
    res.status(500).json({ message: 'Error verifying tenant context', error: error.message });
  }
};
