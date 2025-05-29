import { Router } from 'express';
import { authorize } from '../middlewares/authorize.js';
import { getMonthlySummary } from '../controllers/reportController.js';

const router = Router();

// Only admins and superAdmins can view reports
router.get(
  '/monthly',
  authorize('admin', 'superAdmin'),
  getMonthlySummary
);

export default router;
