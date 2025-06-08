import { Router } from 'express';
import { authorize } from '../middlewares/authorize.js';
import { runPayroll } from '../controllers/payrollController.js';

const router = Router();

// Only admin and superAdmin can run payroll
router.post(
  '/',
  authorize('admin', 'superAdmin'),
  runPayroll
);

export default router;
