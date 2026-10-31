import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  deleteVariant,
} from '../controllers/product.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

// Read routes: any authenticated user (Admin, Staff, Customer)
router.get('/', authenticate, listProducts);
router.get('/:id', authenticate, getProduct);

// Write routes: ADMIN ONLY
router.post('/', authenticate, requireRoles('ADMIN'), createProduct);
router.put('/:id', authenticate, requireRoles('ADMIN'), updateProduct);
router.delete('/:id', authenticate, requireRoles('ADMIN'), deleteProduct);

// Variant management: ADMIN ONLY
router.post('/:id/variants', authenticate, requireRoles('ADMIN'), addVariant);
router.delete('/variants/:id', authenticate, requireRoles('ADMIN'), deleteVariant);

export default router;

