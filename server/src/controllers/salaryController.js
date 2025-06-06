import { asyncHandler } from '../utils/asyncHandler.js';
import * as salaryService from '../services/salaryService.js';

/**
 * POST /api/v1/salary/payments
 * Body: { employeeId, type, amount, description?, paymentMethod, date? }
 */
export const addSalaryPayment = asyncHandler(async (req, res) => {
  const payment = await salaryService.addSalaryPayment(req.body, req.audit);
  res.status(201).json({ success: true, payment });
});

/**
 * GET /api/v1/salary/employees/:employeeId/history
 * Query: from, to, type
 */
export const getEmployeeSalaryHistory = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { from, to, type } = req.query;

  const payments = await salaryService.getEmployeeSalaryHistory(employeeId, {
    from,
    to,
    type
  });

  res.status(200).json({ success: true, payments });
});

/**
 * GET /api/v1/salary/employees/:employeeId/summary
 */
export const getEmployeeSalarySummary = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const summary = await salaryService.getEmployeeSalarySummary(employeeId);
  res.status(200).json({ success: true, summary });
});

/**
 * PUT /api/v1/salary/employees/:employeeId
 * Body: { gross, net }
 */
export const updateEmployeeSalary = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { gross, net } = req.body;
  
  const employee = await salaryService.updateEmployeeSalary(
    employeeId,
    { gross, net },
    req.audit
  );

  res.status(200).json({ success: true, employee });
}); 