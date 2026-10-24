import { Router } from 'express';
import {
  adminDashboard,
  customerDashboard,
  technicianDashboard,
} from '../controllers/dashboard.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);
router.get('/customer', requireRole('customer'), customerDashboard);
router.get('/technician', requireRole('technician'), technicianDashboard);
router.get('/admin', requireRole('admin'), adminDashboard);
export default router;
