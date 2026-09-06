import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import Company from '../models/Company';

/**
 * Enhanced AI Feature Entitlement Middleware
 * Enables AI Copilot & AI features for ALL authenticated roles (SuperAdmin, Admin, SalesManager, SalesRep, User)
 */
export const requireAIFeatureAccess = (_featureKey?: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // Track AI usage in background if company is present
      const activeCompanyId = req.companyId || req.user.companyId;
      if (activeCompanyId) {
        Company.findByIdAndUpdate(activeCompanyId, {
          $inc: { 'subscription.currentAiUsage': 1 },
        }).catch(() => {});
      }

      // Grant access to all authenticated users
      next();
    } catch (error: any) {
      console.error('[SUBSCRIPTION MIDDLEWARE] AI access check error:', error);
      // Fallback: allow request so AI service is not blocked
      next();
    }
  };
};

export default requireAIFeatureAccess;
