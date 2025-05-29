import { asyncHandler } from '../utils/asyncHandler.js';
import * as bankService from '../services/bankService.js';

/**
 * POST /api/v1/bank
 * Body: { date?, type, method, reference?, account, amount }
 */
export const recordBankTransaction = asyncHandler(async (req, res) => {
  const { date, type, method, reference, account, amount } = req.body;
  const transaction = await bankService.recordBankTransaction({
    date,
    type,
    method,
    reference,
    account,
    amount
  }, req.audit);
  res.status(201).json({ success: true, transaction });
});

/**
 * GET /api/v1/bank
 * Query: page, limit, account, method, from, to, includeDeleted
 */
export const getAllBankTransactions = asyncHandler(async (req, res) => {
  const {
    page    = 1,
    limit   = 10,
    account,
    method,
    from,
    to,
    includeDeleted = false
  } = req.query;

  const result = await bankService.getAllBankTransactions({
    account,
    method,
    from,
    to,
    page:  Number(page),
    limit: Number(limit),
    includeDeleted: includeDeleted === 'true'
  }, req.audit);

  res.status(200).json({ success: true, ...result });
});

/**
 * GET /api/v1/bank/:id
 * Query: includeDeleted
 */
export const getBankTransactionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { includeDeleted = false } = req.query;
  const txn = await bankService.getBankTransactionById(id, includeDeleted === 'true');
  res.status(200).json({ success: true, transaction: txn });
});

/**
 * PUT /api/v1/bank/:id
 * Body: { reference }
 */
export const updateBankTransaction = asyncHandler(async (req, res) => {
  const { id }        = req.params;
  const { reference } = req.body;
  const txn = await bankService.updateBankTransaction(id, { reference }, req.audit);
  res.status(200).json({ success: true, transaction: txn });
});

/**
 * DELETE /api/v1/bank-transactions/:id
 */
export const deleteBankTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const txn = await bankService.deleteBankTransaction(id, req.audit);
  res.status(200).json({ success: true, txn });
});
