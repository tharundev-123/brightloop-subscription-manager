import { Router } from 'express';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  deleteTemplate,
} from '../controllers/template.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

// Staff and Admin can view and create templates
router.get('/', authenticate, requireRoles('ADMIN', 'STAFF'), listTemplates);
router.get('/:id', authenticate, requireRoles('ADMIN', 'STAFF'), getTemplate);
router.post('/', authenticate, requireRoles('ADMIN', 'STAFF'), createTemplate);
router.delete('/:id', authenticate, requireRoles('ADMIN'), deleteTemplate);

export default router;

