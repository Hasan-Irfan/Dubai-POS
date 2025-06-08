// src/routes/vendorTransactionRoutes.js
import { Router } from 'express';
import { authorize } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';
import {
  addVendorTransaction,
  getAllVendorTransactions,
  getVendorTransactionById,
  updateVendorTransaction,
  deleteVendorTransaction
} from '../controllers/vendorTransactionController.js';
import {
  createVendorTransactionSchema,
  updateVendorTransactionSchema,
  listVendorTransactionsSchema
} from '../validators/vendor.validator.js';

const router = Router();

// Only admins and superAdmins manage vendor transactions
const guardAdmin = [authorize('admin','superAdmin')];

router
  .route('/')
  .post(...guardAdmin, validate(createVendorTransactionSchema), addVendorTransaction)
  .get(...guardAdmin, validate(listVendorTransactionsSchema, 'query'), getAllVendorTransactions);

router
  .route('/:id')
  .get(...guardAdmin, getVendorTransactionById)
  .put(...guardAdmin, validate(updateVendorTransactionSchema), updateVendorTransaction)
  .delete(...guardAdmin, deleteVendorTransaction);

export default router;
