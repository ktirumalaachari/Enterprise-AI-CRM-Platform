import { Router } from 'express';
import {
  registerCompany,
  getAllCompanies,
  getCompanyById,
  updateCompanyStatus,
  updateCompanySubscription,
  getMyCompany,
  updateMyCompany,
  getCompanySubscriptions,
  getUserSubscriptions,
  updateCompanySubscriptionManual,
  generateJoinCode,
  deactivateJoinCode,
} from '../controllers/companyController';
import { authenticate } from '../middleware/authMiddleware';
import { authorize } from '../middleware/rbacMiddleware';
import { requireTenant } from '../middleware/tenantMiddleware';

const router = Router();

// Public registration
router.post('/register', registerCompany);

// Join Code Management (Company Owner only — must have tenant context)
router.post('/join-code/generate', authenticate, requireTenant, authorize(['COMPANY_OWNER', 'SUPER_ADMIN', 'Admin']), generateJoinCode);
router.post('/join-code/deactivate', authenticate, requireTenant, authorize(['COMPANY_OWNER', 'SUPER_ADMIN', 'Admin']), deactivateJoinCode);

// Authenticated Company Owner profile & settings
router.get('/my-company', authenticate, requireTenant, getMyCompany);
router.put('/my-company', authenticate, requireTenant, authorize(['COMPANY_OWNER', 'SUPER_ADMIN', 'Admin']), updateMyCompany);

// SuperAdmin Subscription Management
router.get('/subscriptions', authenticate, authorize(['SUPER_ADMIN', 'SuperAdmin']), getCompanySubscriptions);
router.get('/user-subscriptions', authenticate, authorize(['SUPER_ADMIN', 'SuperAdmin']), getUserSubscriptions);
router.post('/:id/subscription', authenticate, authorize(['SUPER_ADMIN', 'SuperAdmin']), updateCompanySubscriptionManual);

// SuperAdmin platform management routes
router.get('/', authenticate, authorize(['SUPER_ADMIN', 'SuperAdmin']), getAllCompanies);
router.get('/:id', authenticate, authorize(['SUPER_ADMIN', 'SuperAdmin']), getCompanyById);
router.patch('/:id/status', authenticate, authorize(['SUPER_ADMIN', 'SuperAdmin']), updateCompanyStatus);
router.patch('/:id/subscription', authenticate, authorize(['SUPER_ADMIN', 'SuperAdmin']), updateCompanySubscription);

export default router;
