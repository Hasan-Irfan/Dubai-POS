import { asyncHandler } from '../utils/asyncHandler.js';
import * as reportService from '../services/reportService.js';

/**
 * GET /api/v1/reports/monthly
 * Query: from, to (ISO date)
 */
export const getMonthlySummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      success: false,
      message: "Missing 'from' or 'to' query parameters"
    });
  }

  const summary = await reportService.getMonthlySummary({ from, to }, req.audit);
  res.status(200).json({ success: true, summary });
});
