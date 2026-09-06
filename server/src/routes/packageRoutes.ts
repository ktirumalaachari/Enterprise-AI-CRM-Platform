import { Router } from 'express';
import {
  getAllPackages,
  getAdminPackages,
  createPackage,
  updatePackage,
  updatePackageStatus,
} from '../controllers/packageController';
import { authenticate } from '../middleware/authMiddleware';
import { authorize } from '../middleware/rbacMiddleware';

const router = Router();

// Public / User route — list active packages
router.get('/', getAllPackages);

// Protected SuperAdmin routes
router.get('/admin', authenticate, authorize(['SUPER_ADMIN', 'SuperAdmin']), getAdminPackages);
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'SuperAdmin']), createPackage);
router.put('/:id', authenticate, authorize(['SUPER_ADMIN', 'SuperAdmin']), updatePackage);
router.patch('/:id/status', authenticate, authorize(['SUPER_ADMIN', 'SuperAdmin']), updatePackageStatus);

export default router;
