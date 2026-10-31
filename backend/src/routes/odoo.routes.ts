import { Router } from 'express';
import { getOdooStatus, triggerOdooSync, getOdooRecords } from '../controllers/odoo.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

router.get('/status', authenticate, requireRoles('ADMIN', 'STAFF'), getOdooStatus);
router.post('/sync', authenticate, requireRoles('ADMIN', 'STAFF'), triggerOdooSync);
router.get('/records', authenticate, requireRoles('ADMIN', 'STAFF'), getOdooRecords);

export default router;

