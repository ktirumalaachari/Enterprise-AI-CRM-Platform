import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { UserRole } from '../models/User';

const normalizeRole = (role: string): string => {
  if (role === 'SuperAdmin') return 'SUPER_ADMIN';
  if (role === 'Admin') return 'COMPANY_OWNER';
  if (role === 'SalesManager') return 'SALES_MANAGER';
  if (role === 'SalesRep') return 'SALES_REPRESENTATIVE';
  return role;
};

export const authorize = (allowedRoles: (UserRole | string)[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const userRoleNormalized = normalizeRole(req.user.role);

    // Super Admin has master write access and full bypass to all endpoints and features
    if (userRoleNormalized === 'SUPER_ADMIN') {
      next();
      return;
    }

    const normalizedAllowedRoles = allowedRoles.map((r) => normalizeRole(r));

    if (!normalizedAllowedRoles.includes(userRoleNormalized)) {
      res.status(403).json({ message: 'Forbidden. You do not have permissions to access this resource.' });
      return;
    }

    next();
  };
};
