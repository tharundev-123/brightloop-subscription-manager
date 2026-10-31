import { Router } from 'express';
import {
  getDashboardKPIs,
  getRevenueChartData,
  getRecentActivity,
} from '../controllers/dashboard.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/role.middleware.ts';

const router = Router();

// Staff and Admin access
router.get('/kpis', authenticate, requireRoles('ADMIN', 'STAFF'), getDashboardKPIs);
router.get('/revenue-chart', authenticate, requireRoles('ADMIN', 'STAFF'), getRevenueChartData);
router.get('/recent-activity', authenticate, requireRoles('ADMIN', 'STAFF'), getRecentActivity);

export default router;

