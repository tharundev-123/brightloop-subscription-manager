import { Router } from 'express';
import {
  getCustomerSubscriptions,
  getCustomerInvoices,
} from '../controllers/portal.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

// Customer only portal endpoints
router.get('/subscriptions', authenticate, requireRoles('CUSTOMER'), getCustomerSubscriptions);
router.get('/invoices', authenticate, requireRoles('CUSTOMER'), getCustomerInvoices);

export default router;

