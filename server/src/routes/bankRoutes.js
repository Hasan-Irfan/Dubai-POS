import { Router } from 'express';
import { authorize } from '../middlewares/authorize.js';
import {
  recordBankTransaction,
  getAllBankTransactions,
  getBankTransactionById,
  updateBankTransaction,
  deleteBankTransaction
} from '../controllers/bankController.js';

const router = Router();

// Employees and above can create, list, view, update
const guardBasic = [  authorize('employee','admin','superAdmin') ];
// Only admins and superAdmins can delete
const guardAdmin = [  authorize('admin','superAdmin') ];

router
  .route('/')
  .post(...guardBasic, recordBankTransaction)
  .get (...guardBasic, getAllBankTransactions);

router
  .route('/:id')
  .get   (...guardBasic, getBankTransactionById)
  .put   (...guardBasic, updateBankTransaction)
  .delete(...guardAdmin,   deleteBankTransaction);

export default router;
