import { Router } from 'express';
import { recordUsageEvent, getSubscriptionUsage } from '../controllers/usage.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';

const router = Router();

router.post('/events', authenticate, recordUsageEvent);
router.get('/:subscriptionId', authenticate, getSubscriptionUsage);

export default router;

