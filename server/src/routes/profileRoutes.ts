import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { avatarUpload, handleMulterError } from '../middleware/uploadMiddleware';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  requestEmailChange,
  verifyEmailChange,
  changePassword,
  logoutAllDevices,
  deleteAccount,
} from '../controllers/profileController';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

router.get('/', getProfile);
router.put('/', updateProfile);

// Avatar upload — Multer processes the multipart/form-data file,
// then handleMulterError converts Multer errors to friendly JSON responses
router.post(
  '/upload-avatar',
  (req: Request, res: Response, next: NextFunction) => avatarUpload.single('avatar')(req, res, next),
  handleMulterError,
  uploadAvatar
);

router.delete('/avatar', deleteAvatar);
router.post('/request-email-change', requestEmailChange);
router.put('/verify-email-change', verifyEmailChange);
router.put('/change-password', changePassword);
router.post('/logout-all', logoutAllDevices);

// Permanent account deletion — destructive action, requires DELETE confirmation + password
router.delete('/account', deleteAccount);

export default router;
