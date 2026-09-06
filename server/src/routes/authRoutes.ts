import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  googleLogin,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  selectCompany,
} from '../controllers/authController';
import { authenticate, AuthenticatedRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import Company from '../models/Company';
import { Response } from 'express';
import { forgotPasswordRateLimit, otpVerificationRateLimit, resetPasswordRateLimit } from '../middlewares/rateLimit';
import SubscriptionService from '../services/subscriptionService';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/google-login', googleLogin);

// Company selection for multi-company users
router.post('/select-company', authenticate, selectCompany);

// Password reset endpoints with rate limiting
router.post('/forgot-password', forgotPasswordRateLimit, forgotPassword);
router.post('/verify-reset-otp', otpVerificationRateLimit, verifyResetOtp);
router.post('/reset-password', resetPasswordRateLimit, resetPassword);

// Protected routes to verify token and fetch active user session
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    let companyName = user.company || '';
    let companyStatus = 'ACTIVE';
    const activeCompanyId = req.companyId || user.companyId;

    if (activeCompanyId) {
      const comp = await Company.findById(activeCompanyId);
      if (comp) {
        companyName = comp.companyName;
        companyStatus = comp.status;
      }
    }

    let normalizedRole = user.role || 'SALES_REPRESENTATIVE';
    if (normalizedRole === 'SuperAdmin') normalizedRole = 'SUPER_ADMIN';
    if (normalizedRole === 'Admin') normalizedRole = 'COMPANY_OWNER';
    if (normalizedRole === 'SalesManager') normalizedRole = 'SALES_MANAGER';
    if (normalizedRole === 'SalesRep') normalizedRole = 'SALES_REPRESENTATIVE';

    const subStatus = SubscriptionService.getSubscriptionStatus(user);
    const isSuperAdmin = normalizedRole === 'SUPER_ADMIN';
    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: normalizedRole,
        avatar: user.avatar,
        companyId: activeCompanyId,
        companyName,
        companyStatus,
        accountStatus: isSuperAdmin ? 'ACTIVE' : (user.accountStatus || 'ACTIVE'),
        subscription: subStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error retrieving current session', error: error.message });
  }
});

export default router;
