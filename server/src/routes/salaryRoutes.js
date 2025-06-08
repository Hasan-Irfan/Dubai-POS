import { Router } from 'express';
import validate from '../middlewares/validate.js';
import { authorize } from '../middlewares/authorize.js';
import {
  addSalaryPayment,
  getEmployeeSalaryHistory,
  getEmployeeSalarySummary,
  updateEmployeeSalary
} from '../controllers/salaryController.js';

import {
  addSalaryPaymentSchema,
  getSalaryHistorySchema,
  updateSalarySchema
} from '../validators/salary.validator.js';

const router = Router();
const guard = authorize('admin', 'superAdmin');

// POST /api/v1/salary/payments
router.post(
  '/payments',
  guard,
  validate(addSalaryPaymentSchema, 'body'),
  addSalaryPayment
);

// GET /api/v1/salary/employees/:employeeId/history
router.get(
  '/employees/:employeeId/history',
  guard,
  validate(getSalaryHistorySchema, 'query'),
  getEmployeeSalaryHistory
);

// GET /api/v1/salary/employees/:employeeId/summary
router.get(
  '/employees/:employeeId/summary',
  guard,
  getEmployeeSalarySummary
);

// PUT /api/v1/salary/employees/:employeeId
router.put(
  '/employees/:employeeId',
  guard,
  validate(updateSalarySchema, 'body'),
  updateEmployeeSalary
);

export default router; 