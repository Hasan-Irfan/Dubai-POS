import { asyncHandler } from '../utils/asyncHandler.js';
import * as payrollService from '../services/payrollService.js';

/**
 * POST /api/v1/payroll
 * Body: { month, year, paymentDate? }
 */
export const runPayroll = asyncHandler(async (req, res) => {
  const { month, year, paymentDate } = req.body;

  if (!month || !year) {
    return res.status(400).json({
      success: false,
      message: "Month and year are required"
    });
  }

  const payroll = await payrollService.runPayroll({ month, year, paymentDate }, req.audit);
  res.status(200).json({ success: true, payroll });
});
