import { Router } from 'express';
import {
  listInvoices,
  getInvoice,
  triggerManualBillingRun,
  confirmInvoice,
  cancelInvoice,
  sendInvoiceEmail,
  downloadInvoicePdf,
} from '../controllers/invoice.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

// List & Detail
router.get('/', authenticate, listInvoices);
router.get('/:id', authenticate, getInvoice);
router.get('/:id/pdf', authenticate, downloadInvoicePdf);

// Manual Billing Run: Staff & Admin
router.post('/manual-run', authenticate, requireRoles('ADMIN', 'STAFF'), triggerManualBillingRun);

// Invoice status transitions & actions: Staff & Admin
router.put('/:id/confirm', authenticate, requireRoles('ADMIN', 'STAFF'), confirmInvoice);
router.put('/:id/cancel', authenticate, requireRoles('ADMIN', 'STAFF'), cancelInvoice);
router.post('/:id/send', authenticate, requireRoles('ADMIN', 'STAFF'), sendInvoiceEmail);

export default router;

