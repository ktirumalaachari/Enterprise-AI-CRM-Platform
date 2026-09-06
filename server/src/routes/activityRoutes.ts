import { Router } from 'express';
import { getActivityLogs } from '../controllers/activityController';
import { authenticate } from '../middleware/authMiddleware';
import { authorize } from '../middleware/rbacMiddleware';

const router = Router();

// Audit logs require authentication & admin privileges
router.get('/', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_OWNER', 'SuperAdmin', 'Admin']), getActivityLogs);

export default router;
