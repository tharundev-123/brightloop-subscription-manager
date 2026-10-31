import { Router } from 'express';
import {
  recordPayment,
  listPayments,
  getOutstandingInvoices,
  getOverdueInvoices,
} from '../controllers/payment.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

// Staff and Admin endpoints
router.get('/', authenticate, requireRoles('ADMIN', 'STAFF'), listPayments);
router.post('/', authenticate, requireRoles('ADMIN', 'STAFF'), recordPayment);
router.get('/outstanding', authenticate, requireRoles('ADMIN', 'STAFF'), getOutstandingInvoices);
router.get('/overdue', authenticate, requireRoles('ADMIN', 'STAFF'), getOverdueInvoices);

export default router;

