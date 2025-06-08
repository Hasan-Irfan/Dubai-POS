// src/controllers/advanceController.js
import { asyncHandler } from '../utils/asyncHandler.js';
import * as advanceService from '../services/advanceService.js';

/**
 * POST /api/v1/advances
 * Body: { invoiceId, salesmanId, amount, note?, paymentMethod?, account? }
 */
export const recordAdvance = asyncHandler(async (req, res) => {
  const { invoiceId, salesmanId, amount, note, paymentMethod, account } = req.body;
  const advance = await advanceService.recordAdvance(
    { invoiceId, salesmanId, amount, note, paymentMethod, account },
    req.audit
  );
  res.status(201).json({ success: true, advance });
});

/**
 * GET /api/v1/advances
 * Query: page, limit, salesmanId, from, to
 */
export const getAllAdvances = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    salesmanId,
    recovered,
    from,
    to,
    search = ''
  } = req.query;

  const result = await advanceService.getAllAdvances({
    filters: { salesmanId, recovered },
    dateRange: { from, to },
    search,
    page: Number(page),
    limit: Number(limit)
  }, req.audit);

  res.status(200).json({ success: true, ...result });
});

/**
 * GET /api/v1/advances/:id
 */
export const getAdvanceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const advance = await advanceService.getAdvanceById(id, req.audit);
  res.status(200).json({ success: true, advance });
});

/**
 * PUT /api/v1/advances/:id
 * Body: { note?, recovered? }
 */
export const updateAdvance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const advance = await advanceService.updateAdvance(id, updateData, req.audit);
  res.status(200).json({ success: true, advance });
});

/**
 * DELETE /api/v1/advances/:id
 */
export const deleteAdvance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const advance = await advanceService.deleteAdvance(id, req.audit);
  res.status(200).json({ success: true, advance });
});
