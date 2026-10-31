import { Router } from 'express';
import {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
} from '../controllers/plan.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

// Read routes: any authenticated user
router.get('/', authenticate, listPlans);
router.get('/:id', authenticate, getPlan);

// Write routes: ADMIN ONLY
router.post('/', authenticate, requireRoles('ADMIN'), createPlan);
router.put('/:id', authenticate, requireRoles('ADMIN'), updatePlan);
router.delete('/:id', authenticate, requireRoles('ADMIN'), deletePlan);

export default router;

