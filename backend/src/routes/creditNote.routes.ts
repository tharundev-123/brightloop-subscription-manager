import { Router } from 'express';
import { getCreditNotes, createCreditNote, getCreditNoteById } from '../controllers/creditNote.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

router.get('/', authenticate, getCreditNotes);
router.post('/', authenticate, requireRoles('ADMIN', 'STAFF'), createCreditNote);
router.get('/:id', authenticate, getCreditNoteById);

export default router;

