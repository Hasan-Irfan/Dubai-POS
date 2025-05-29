import { asyncHandler } from '../utils/asyncHandler.js';
import * as cashService from '../services/cashService.js';

/**
 * POST /api/v1/cash
 * Body: { date?, type, reference?, amount }
 */
export const recordCashEntry = asyncHandler(async (req, res) => {
  const { date, type, reference, amount } = req.body;
  const entry = await cashService.recordCashEntry({ 
    date, 
    type, 
    reference, 
    amount 
  }, req.audit);
  res.status(201).json({ success: true, entry });
});

/**
 * GET /api/v1/cash
 * Query: page, limit, type, from, to, includeDeleted
 */
export const getAllCashEntries = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    type,
    from,
    to,
    includeDeleted = false
  } = req.query;

  const result = await cashService.getAllCashEntries({
    from,
    to,
    type,
    page: Number(page),
    limit: Number(limit),
    includeDeleted: includeDeleted === 'true'
  });

  res.status(200).json({ success: true, ...result });
});

/**
 * GET /api/v1/cash/:id
 * Query: includeDeleted
 */
export const getCashEntryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { includeDeleted = false } = req.query;
  const entry = await cashService.getCashEntryById(id, includeDeleted === 'true');
  res.status(200).json({ success: true, entry });
});

/**
 * PUT /api/v1/cash/:id
 * Body: { reference }
 */
export const updateCashEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reference } = req.body;
  const entry = await cashService.updateCashEntry(id, { reference }, req.audit);
  res.status(200).json({ success: true, entry });
});

/**
 * DELETE /api/v1/cash/:id
 * Soft deletes the cash entry
 */
export const deleteCashEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const entry = await cashService.deleteCashEntry(id, req.audit);
  res.status(200).json({ success: true, entry, message: 'Cash entry soft deleted successfully' });
});

/**
 * POST /api/v1/cash/:id/restore
 * Restores a soft-deleted cash entry
 */
export const restoreCashEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const entry = await cashService.restoreCashEntry(id, req.audit);
  res.status(200).json({ success: true, entry, message: 'Cash entry restored successfully' });
});
