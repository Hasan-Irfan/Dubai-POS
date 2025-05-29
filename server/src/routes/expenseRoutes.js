import { Router } from 'express';
import { authorize } from '../middlewares/authorize.js';
import {
  recordExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
} from '../controllers/expenseController.js';

const router = Router();

// All employees can create, view, and update expenses
const guardBasic = [ authorize('employee', 'admin', 'superAdmin') ];
// Only admin+ can delete
const guardAdmin = [ authorize('admin', 'superAdmin') ];

router
  .route('/')
  .post(...guardBasic, recordExpense)
  .get (...guardBasic, getAllExpenses);

router
  .route('/:id')
  .get   (...guardBasic, getExpenseById)
  .put   (...guardBasic, updateExpense)
  .delete(...guardAdmin, deleteExpense);

export default router;
