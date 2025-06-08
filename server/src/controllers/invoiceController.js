// src/controllers/invoiceController.js
import { asyncHandler } from '../utils/asyncHandler.js';
import * as invoiceService from '../services/invoiceService.js';

/**
 * POST /api/v1/invoices
 * Body: { invoiceNumber, date?, customerName, salesmanId, items: […], status? }
 */
export const createInvoice = asyncHandler(async (req, res) => {
  const invoiceData = req.body;
  const invoice = await invoiceService.createInvoice(invoiceData, req.audit);
  res.status(201).json({ success: true, invoice });
});

/**
 * GET /api/v1/invoices
 * Query: page, limit, status, salesmanId, from, to, sort, customerName
 */
export const getAllInvoices = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    salesmanId,
    from,
    to,
    sort = '-createdAt',
    customerName
  } = req.query;

  const result = await invoiceService.getAllInvoices({
    filters: { status, salesmanId, customerName },
    from,
    to,
    page: Number(page),
    limit: Number(limit),
    sort
  });

  res.status(200).json({ success: true, ...result });
});

/**
 * GET /api/v1/invoices/:id
 */
export const getInvoiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = await invoiceService.getInvoiceById(id);
  res.status(200).json({ success: true, invoice });
});

/**
 * PUT /api/v1/invoices/:id
 * Body: any of { items, status, customerName, date }
 */
export const updateInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const invoice = await invoiceService.updateInvoice(id, updateData, req.audit);
  res.status(200).json({ success: true, invoice });
});

/**
 * DELETE /api/v1/invoices/:id
 */
export const deleteInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = await invoiceService.deleteInvoice(id, req.audit);
  res.status(200).json({ success: true, invoice });
});

/**
 * POST /api/v1/invoices/:id/payments
 * Body: { amount, method, account, date }
 */
export const addPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, method, account, date } = req.body;
  const invoice = await invoiceService.addPayment(
    id,
    { amount, method, account, date },
    req.audit
  );
  res.status(200).json({ success: true, invoice });
});

/**
 * POST /api/v1/invoices/:id/payments/:paymentId/reverse
 * Body: { reason }
 */
export const reversePayment = asyncHandler(async (req, res) => {
  const { id, paymentId } = req.params;
  const { reason } = req.body;
  
  if (!reason) {
    return res.status(400).json({ 
      success: false, 
      message: 'Reason for reversal is required' 
    });
  }
  
  const invoice = await invoiceService.reversePayment(
    id,
    paymentId,
    reason,
    req.audit
  );
  res.status(200).json({ success: true, invoice });
});

/**
 * POST /api/v1/invoices/:id/commission
 * Body: { amount, method, account, date, note }
 */
export const updateCommission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, method, account, date, note } = req.body;
  
  const invoice = await invoiceService.updateCommissionPayment(
    id,
    { amount, method, account, date, note },
    req.audit
  );
  
  res.status(200).json({ success: true, invoice });
});
