import { Router } from 'express';
import {
  listDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  validateDiscountCode,
} from '../controllers/taxDiscount.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

// Read & Validate: authenticated
router.get('/', authenticate, listDiscounts);
router.post('/validate', authenticate, validateDiscountCode);

// Write: ADMIN ONLY
router.post('/', authenticate, requireRoles('ADMIN'), createDiscount);
router.put('/:id', authenticate, requireRoles('ADMIN'), updateDiscount);
router.delete('/:id', authenticate, requireRoles('ADMIN'), deleteDiscount);

export default router;

