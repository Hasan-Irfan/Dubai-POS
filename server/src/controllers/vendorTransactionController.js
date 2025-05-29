// src/controllers/vendorTransactionController.js
import { asyncHandler } from '../utils/asyncHandler.js';
import * as vendorTxnService from '../services/vendorTxnService.js';

/**
 * POST /api/v1/vendor-transactions
 * Body: { vendorId, type, description?, amount, method, account }
 */
export const addVendorTransaction = asyncHandler(async (req, res) => {
  const { vendorId, type, description, amount, method, account } = req.body;
  const transaction = await vendorTxnService.addVendorTransaction({
    vendorId,
    type,
    description,
    amount,
    method,
    account
  }, req.audit);
  res.status(201).json({ success: true, transaction });
});

/**
 * GET /api/v1/vendor-transactions
 * Query: page, limit, vendorId, from, to
 */
export const getAllVendorTransactions = asyncHandler(async (req, res) => {
  const {
    page     = 1,
    limit    = 10,
    vendorId,
    from,
    to
  } = req.query;

  const result = await vendorTxnService.getAllVendorTransactions({
    vendorId,
    from,
    to,
    page:  Number(page),
    limit: Number(limit)
  });

  res.status(200).json({ success: true, ...result });
});

/**
 * GET /api/v1/vendor-transactions/:id
 */
export const getVendorTransactionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const transaction = await vendorTxnService.getVendorTransactionById(id);
  res.status(200).json({ success: true, transaction });
});

/**
 * PUT /api/v1/vendor-transactions/:id
 * Body: { description }
 */
export const updateVendorTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;
  const transaction = await vendorTxnService.updateVendorTransaction(id, { description }, req.audit);
  res.status(200).json({ success: true, transaction });
});

/**
 * DELETE /api/v1/vendor-transactions/:id
 */
export const deleteVendorTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const transaction = await vendorTxnService.deleteVendorTransaction(id, req.audit);
  res.status(200).json({ success: true, transaction });
});
