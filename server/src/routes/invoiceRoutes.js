import { Router } from 'express';
import validate from '../middlewares/validate.js';
import { authorize } from '../middlewares/authorize.js';

import {
  createInvoiceSchema,
  listInvoicesSchema,
  getInvoiceByIdSchema,
  updateInvoiceSchema,
  deleteInvoiceSchema,
  addPaymentSchema,
  reversePaymentSchema,
  paymentIdParamSchema,
  commissionPaymentSchema
} from '../validators/invoice.validator.js';

import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  addPayment,
  reversePayment,
  updateCommission
} from '../controllers/invoiceController.js';

const router = Router();
// Auth middleware definitions - can be used optionally based on environment
const basic = authorize('employee','admin','superAdmin');
const admin = authorize('admin','superAdmin');

// POST & GET /api/v1/invoices
router.route('/')
  .post(
    basic,
    validate(createInvoiceSchema, 'body'),
    createInvoice
  )
  .get(
    basic,
    validate(listInvoicesSchema, 'query'),
    getAllInvoices
  );

// GET, PUT, DELETE /api/v1/invoices/:id
router.route('/:id')
  .get(
    basic,
    validate(getInvoiceByIdSchema, 'params'),
    getInvoiceById
  )
  .put(
    basic,
    validate(getInvoiceByIdSchema, 'params'),
    validate(updateInvoiceSchema,    'body'),
    updateInvoice
  )
  .delete(
    admin,
    validate(deleteInvoiceSchema, 'params'),
    deleteInvoice
  );

// Route for adding a payment
router.route('/:id/payments')
  .post(
    validate(getInvoiceByIdSchema, 'params'),
    validate(addPaymentSchema, 'body'),
    addPayment
  );

// Route for reversing a payment
router.route('/:id/payments/:paymentId/reverse')
  .post(
    validate(paymentIdParamSchema, 'params'),
    validate(reversePaymentSchema, 'body'),
    reversePayment
  );

// Route for updating commission payment
router.route('/:id/commission')
  .post(
    validate(getInvoiceByIdSchema, 'params'),
    validate(commissionPaymentSchema, 'body'),
    updateCommission
  );

export default router;
