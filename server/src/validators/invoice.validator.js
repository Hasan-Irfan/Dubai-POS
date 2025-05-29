// src/validators/invoice.validator.js
import Joi from 'joi';

const idParam = Joi.string().hex().length(24).required();

export const createInvoiceSchema = Joi.object({
  invoiceNumber: Joi.string().required(),
  date:          Joi.date().iso(),
  customerName:  Joi.string().required(),
  salesmanId:    idParam,
  items: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      quantity:    Joi.number().integer().positive().required(),
      unitPrice:   Joi.number().precision(2).positive().required(),
      costPrice:   Joi.number().precision(2).positive().required(),
      vatAmount:   Joi.number().precision(2).min(0).optional()
    })
  ).min(1).required(),

  payments: Joi.array().items(
    Joi.object({
      method: Joi.string().valid('Cash', 'Bank', 'Shabka').required(),
      amount: Joi.number().min(0).optional(),
      date: Joi.date().optional(), 
    })
  ).optional(),

  status: Joi.string().valid('Paid','Partially Paid','Unpaid')
});

export const listInvoicesSchema = Joi.object({
  page:       Joi.number().integer().min(1).default(1),
  limit:      Joi.number().integer().min(1).default(10),
  status:     Joi.string().valid('Paid','Partially Paid','Unpaid'),
  salesmanId: Joi.string().hex().length(24),
  from:       Joi.date().iso(),
  to:         Joi.date().iso(),
  sort:       Joi.string(),
  customerName: Joi.string()
});

export const getInvoiceByIdSchema   = Joi.object({ id: idParam });
export const updateInvoiceSchema    = Joi.object({
  invoiceNumber: Joi.string(),
  date:          Joi.date().iso(),
  customerName:  Joi.string(),
  salesmanId:    Joi.string().hex().length(24),
  items: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      quantity:    Joi.number().integer().positive().required(),
      unitPrice:   Joi.number().precision(2).positive().required(),
      costPrice:   Joi.number().precision(2).positive().required(),
      vatAmount:   Joi.number().precision(2).min(0).required()
    })
  ),
  status: Joi.string().valid('Paid','Partially Paid','Unpaid')
});

export const deleteInvoiceSchema    = Joi.object({ id: idParam });

// Schema for adding a payment to an invoice
export const addPaymentSchema = Joi.object({
  amount: Joi.number().precision(2).positive().required(),
  method: Joi.string().valid('Cash','Bank','Shabka').required(),
  date: Joi.date().iso()
});

// Schema for reversing a payment
export const reversePaymentSchema = Joi.object({
  reason: Joi.string().min(3).max(200).required()
});

// Schema for payment ID parameter
export const paymentIdParamSchema = Joi.object({
  id: idParam,
  paymentId: Joi.string().required()
});

// Schema for commission payment
export const commissionPaymentSchema = Joi.object({
  amount: Joi.number().precision(2).positive().required(),
  method: Joi.string().valid('Cash','Bank','Shabka').required(),
  date: Joi.date().iso(),
  note: Joi.string().max(200)
});
