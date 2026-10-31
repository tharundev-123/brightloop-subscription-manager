import { Router } from 'express';
import {
  listSubscriptions,
  getSubscription,
  createSubscription,
  createFromTemplate,
  updateSubscriptionStatus,
  togglePauseSubscription,
  renewSubscription,
  closeSubscription,
} from '../controllers/subscription.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

// List subscriptions (Staff/Admin sees all, Customer sees own)
router.get('/', authenticate, listSubscriptions);
router.get('/:id', authenticate, getSubscription);

// Creation (Staff & Admin)
router.post('/', authenticate, requireRoles('ADMIN', 'STAFF'), createSubscription);
router.post('/from-template', authenticate, requireRoles('ADMIN', 'STAFF'), createFromTemplate);

// Status Flow (Staff & Admin)
router.put('/:id/status', authenticate, requireRoles('ADMIN', 'STAFF'), updateSubscriptionStatus);

// Lifecycle actions (governed by plan flags)
router.post('/:id/pause', authenticate, togglePauseSubscription);
router.post('/:id/renew', authenticate, renewSubscription);
router.post('/:id/close', authenticate, closeSubscription);

export default router;

