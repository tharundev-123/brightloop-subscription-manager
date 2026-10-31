import { Router } from 'express';
import {
  recordPayment,
  listPayments,
  getOutstandingInvoices,
  getOverdueInvoices,
  processOnlineCheckout,
} from '../controllers/payment.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

// Online checkout (accessible by all authenticated users: customers pay their invoices, staff can too)
router.post('/checkout', authenticate, processOnlineCheckout);

// Staff and Admin endpoints
router.get('/', authenticate, requireRoles('ADMIN', 'STAFF'), listPayments);
router.post('/', authenticate, requireRoles('ADMIN', 'STAFF'), recordPayment);
router.get('/outstanding', authenticate, requireRoles('ADMIN', 'STAFF'), getOutstandingInvoices);
router.get('/overdue', authenticate, requireRoles('ADMIN', 'STAFF'), getOverdueInvoices);

export default router;
