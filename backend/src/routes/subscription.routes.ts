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
  previewPlanProration,
  changeSubscriptionPlan,
  runDunningScan,
  sendInvoiceDunningReminder,
} from '../controllers/subscription.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

// Dunning operations
router.post('/dunning/run', authenticate, requireRoles('ADMIN', 'STAFF'), runDunningScan);
router.post('/dunning/remind', authenticate, requireRoles('ADMIN', 'STAFF'), sendInvoiceDunningReminder);

// List subscriptions (Staff/Admin sees all, Customer sees own)
router.get('/', authenticate, listSubscriptions);
router.get('/:id', authenticate, getSubscription);

// Creation (Staff & Admin)
router.post('/', authenticate, requireRoles('ADMIN', 'STAFF'), createSubscription);
router.post('/from-template', authenticate, requireRoles('ADMIN', 'STAFF'), createFromTemplate);

// Status Flow (Staff & Admin)
router.put('/:id/status', authenticate, requireRoles('ADMIN', 'STAFF'), updateSubscriptionStatus);

// Proration & Plan Change (Admin, Staff, or Customer on own sub)
router.get('/:id/preview-proration', authenticate, previewPlanProration);
router.post('/:id/change-plan', authenticate, changeSubscriptionPlan);

// Lifecycle actions (governed by plan flags)
router.post('/:id/pause', authenticate, togglePauseSubscription);
router.post('/:id/renew', authenticate, renewSubscription);
router.post('/:id/close', authenticate, closeSubscription);

export default router;
