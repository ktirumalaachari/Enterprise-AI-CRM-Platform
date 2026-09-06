import { Router } from 'express';
import { 
  getDeals, 
  createDeal, 
  updateDealStage, 
  updateDeal, 
  deleteDeal, 
  getSalesAnalytics 
} from '../controllers/dealController';
import { authenticate } from '../middleware/authMiddleware';
import { authorize } from '../middleware/rbacMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getDeals);
router.get('/analytics', getSalesAnalytics);
router.post('/', createDeal);
router.patch('/:id/stage', updateDealStage);
router.put('/:id', updateDeal);
router.delete('/:id', authorize(['SuperAdmin', 'Admin', 'SalesManager']), deleteDeal);

export default router;
