import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getRbacMatrix, testEndpointAccess } from '../controllers/rbacController';

const router = Router();

// All RBAC endpoints require authentication
router.use(authenticate);

// GET /api/rbac/matrix — Get full RBAC permission matrix catalog
router.get('/matrix', getRbacMatrix);

// POST /api/rbac/test-access — Real-time backend authorization enforcement test
router.post('/test-access', testEndpointAccess);

export default router;
