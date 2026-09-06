import { Router } from 'express';
import { createOrder, verifyPayment, getSubscriptionStatus, handleWebhook } from '../controllers/paymentController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Protected subscription & payment routes
router.post('/create-order', authenticate, createOrder);
router.post('/verify', authenticate, verifyPayment);
router.post('/verify-payment', authenticate, verifyPayment);
router.get('/subscription-status', authenticate, getSubscriptionStatus);

// Webhook endpoint (unauthenticated, signature checked internally)
router.post('/webhook', handleWebhook);

export default router;
