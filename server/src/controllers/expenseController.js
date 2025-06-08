import { asyncHandler } from '../utils/asyncHandler.js';
import * as expenseService from '../services/expenseService.js';

/**
 * POST /api/v1/expenses
 * Body: { date?, category, description?, amount, paymentType, paidTo?, paidToModel?, linkedTo?, linkedToModel? }
 */
export const recordExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.recordExpense(req.body, req.audit);
  res.status(201).json({ success: true, expense });
});

/**
 * GET /api/v1/expenses
 * Query: page, limit, category, paymentType, paidToModel, paidTo, search, from, to, sortBy, sortOrder
 */
export const getAllExpenses = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    category,
    paymentType,
    paidToModel,
    paidTo,
    search,
    from,
    to,
    sortBy = 'date',
    sortOrder = 'desc'
  } = req.query;

  const result = await expenseService.getAllExpenses({
    category,
    paymentType,
    paidToModel,
    paidTo,
    search,
    from,
    to,
    page: Number(page),
    limit: Number(limit),
    sortBy,
    sortOrder
  }, req.audit);

  res.status(200).json({ success: true, ...result });
});

/**
 * GET /api/v1/expenses/:id
 */
export const getExpenseById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const expense = await expenseService.getExpenseById(id, req.audit);
  res.status(200).json({ success: true, expense });
});

/**
 * PUT /api/v1/expenses/:id
 * Body: { date?, category?, description?, amount?, paymentType?, paidTo?, paidToModel?, linkedTo?, linkedToModel? }
 */
export const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const expense = await expenseService.updateExpense(id, updateData, req.audit);
  res.status(200).json({ success: true, expense });
});

/**
 * DELETE /api/v1/expenses/:id
 */
export const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const expense = await expenseService.deleteExpense(id, req.audit);
  res.status(200).json({ success: true, expense });
});
