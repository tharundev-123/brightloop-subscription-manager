import { Router } from 'express';
import { createStaff, listUsers } from '../controllers/user.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

// List users: allowed for Admin and Staff
router.get('/', authenticate, requireRoles('ADMIN', 'STAFF'), listUsers);

// Create internal staff: strictly ADMIN ONLY
router.post('/staff', authenticate, requireRoles('ADMIN'), createStaff);

export default router;

