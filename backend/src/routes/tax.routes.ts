import { Router } from 'express';
import {
  listTaxes,
  createTax,
  updateTax,
  deleteTax,
} from '../controllers/taxDiscount.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

// Read: authenticated
router.get('/', authenticate, listTaxes);

// Write: ADMIN ONLY
router.post('/', authenticate, requireRoles('ADMIN'), createTax);
router.put('/:id', authenticate, requireRoles('ADMIN'), updateTax);
router.delete('/:id', authenticate, requireRoles('ADMIN'), deleteTax);

export default router;

