import express from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  forgotPassword,
  verifyEmail,
  resendVerification,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/reset-password', resetPassword);

export default router;
