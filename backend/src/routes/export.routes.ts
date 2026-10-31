import { Router } from 'express';
import {
  exportSubscriptionsCsv,
  exportInvoicesCsv,
  exportPaymentsCsv,
} from '../controllers/export.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

router.get('/subscriptions.csv', authenticate, requireRoles('ADMIN', 'STAFF'), exportSubscriptionsCsv);
router.get('/invoices.csv', authenticate, requireRoles('ADMIN', 'STAFF'), exportInvoicesCsv);
router.get('/payments.csv', authenticate, requireRoles('ADMIN', 'STAFF'), exportPaymentsCsv);

export default router;

