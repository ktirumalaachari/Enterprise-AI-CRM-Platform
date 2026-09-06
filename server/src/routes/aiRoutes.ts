import { Router } from 'express';
import { generateEmail, summarizeNotes, copilotChat } from '../controllers/aiController';
import { authenticate } from '../middleware/authMiddleware';
import { requireAIFeatureAccess } from '../middleware/subscriptionMiddleware';

const router = Router();

// Authentication required for all AI routes
router.use(authenticate);

router.post('/generate-email', requireAIFeatureAccess('emailGenerator'), generateEmail);
router.post('/summarize-notes', requireAIFeatureAccess('meetingSummary'), summarizeNotes);
router.post('/copilot-chat', requireAIFeatureAccess('copilotChat'), copilotChat);

export default router;
