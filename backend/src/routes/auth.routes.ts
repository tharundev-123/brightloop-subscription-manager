import { Router } from 'express';
import { signup, login, forgotPassword, resetPassword, getCurrentUser } from '../controllers/auth.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Authenticated route
router.get('/me', authenticate, getCurrentUser);

export default router;

