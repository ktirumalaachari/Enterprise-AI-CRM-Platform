import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/authMiddleware';
import { authorize } from '../middleware/rbacMiddleware';
import {
  getAllUsers,
  createUser,
  updateUserRole,
  updateUserStatus,
  resetUserPassword,
  deleteUser,
  bulkUserAction,
  getSuperAdminMetrics,
} from '../controllers/userController';

const router = Router();

// Require authentication for all user routes
router.use(authenticate);

// -----------------------------------------------------------
// Workspace User Management
// -----------------------------------------------------------
router.get('/', getAllUsers);
router.post('/', authorize(['SUPER_ADMIN', 'COMPANY_OWNER', 'SuperAdmin', 'Admin']), createUser);
router.put('/:id/role', authorize(['SUPER_ADMIN', 'COMPANY_OWNER', 'SuperAdmin', 'Admin']), updateUserRole);
router.put('/:id/status', authorize(['SUPER_ADMIN', 'COMPANY_OWNER', 'SuperAdmin', 'Admin']), updateUserStatus);
router.post('/:id/reset-password', authorize(['SUPER_ADMIN', 'COMPANY_OWNER', 'SuperAdmin', 'Admin']), resetUserPassword);
router.delete('/:id', authorize(['SUPER_ADMIN', 'COMPANY_OWNER', 'SuperAdmin', 'Admin']), deleteUser);
router.post('/bulk', authorize(['SUPER_ADMIN', 'SuperAdmin']), bulkUserAction);

// -----------------------------------------------------------
// Dedicated SuperAdmin Dashboard Metrics
// -----------------------------------------------------------
router.get('/superadmin-metrics', authorize(['SUPER_ADMIN', 'SuperAdmin']), getSuperAdminMetrics);

// Legacy test routes retained for backward compatibility
router.get('/admin-dashboard', authorize(['SUPER_ADMIN', 'COMPANY_OWNER', 'SuperAdmin', 'Admin']), (req: AuthenticatedRequest, res: Response) => {
  res.json({
    message: `Access granted to Admin Panel. Hello ${req.user?.role}!`,
    data: {
      systemHealth: 'OK',
      totalUsers: 48,
      activeSessions: 12,
    },
  });
});

router.get('/pipeline-settings', authorize(['SUPER_ADMIN', 'COMPANY_OWNER', 'SALES_MANAGER', 'SuperAdmin', 'Admin', 'SalesManager']), (req: AuthenticatedRequest, res: Response) => {
  res.json({
    message: `Access granted to Pipeline Settings. Hello ${req.user?.role}!`,
    data: {
      stages: ['Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'],
      allowDeletions: req.user?.role !== 'SALES_MANAGER' && (req.user?.role as any) !== 'SalesManager',
    },
  });
});

router.get('/my-deals', authorize(['SUPER_ADMIN', 'COMPANY_OWNER', 'SALES_MANAGER', 'SALES_REPRESENTATIVE', 'SuperAdmin', 'Admin', 'SalesManager', 'SalesRep']), (req: AuthenticatedRequest, res: Response) => {
  res.json({
    message: `Access granted to Deals list. Hello ${req.user?.role}!`,
    data: [
      { id: '1', title: 'Enterprise Cloud Agreement', value: 120000, stage: 'Negotiation' },
      { id: '2', title: 'Consulting Pilot Program', value: 15000, stage: 'Lead' },
    ],
  });
});

export default router;
