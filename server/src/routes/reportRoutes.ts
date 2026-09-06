import { Router } from 'express';
import { getReportSummary, exportReport, getKpis, updateKpis } from '../controllers/reportController';
import { authenticate } from '../middleware/authMiddleware';
import { authorize } from '../middleware/rbacMiddleware';

const router = Router();

router.use(authenticate);

router.get('/summary', getReportSummary);
router.get('/export', exportReport);
router.get('/kpis', getKpis);
router.put('/kpis', authorize(['SuperAdmin', 'Admin']), updateKpis);

export default router;
