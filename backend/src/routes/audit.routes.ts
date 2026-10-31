import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

router.get('/', authenticate, requireRoles('ADMIN', 'STAFF'), getAuditLogs);

export default router;

