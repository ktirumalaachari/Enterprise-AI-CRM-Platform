import { Router } from 'express';
import {
  submitJoinRequest,
  getMyJoinRequest,
  getCompanyJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  streamJoinRequestEvents,
} from '../controllers/joinRequestController';
import { authenticate } from '../middleware/authMiddleware';
import { authorize } from '../middleware/rbacMiddleware';

const router = Router();

// Real-time SSE stream for join requests
router.get('/events', authenticate, streamJoinRequestEvents);

// Any authenticated user can submit a join request
router.post('/', authenticate, submitJoinRequest);

// Any authenticated user can check their own request status
router.get('/my', authenticate, getMyJoinRequest);

// Company Owner/Admin only — list and manage join requests for their company
router.get('/', authenticate, authorize(['COMPANY_OWNER', 'SUPER_ADMIN', 'Admin']), getCompanyJoinRequests);
router.post('/:id/approve', authenticate, authorize(['COMPANY_OWNER', 'SUPER_ADMIN', 'Admin']), approveJoinRequest);
router.post('/:id/reject', authenticate, authorize(['COMPANY_OWNER', 'SUPER_ADMIN', 'Admin']), rejectJoinRequest);

export default router;
