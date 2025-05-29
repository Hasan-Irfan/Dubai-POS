import { Router } from 'express';
import { authorize } from '../middlewares/authorize.js';
import {
  recordCashEntry,
  getAllCashEntries,
  getCashEntryById,
  updateCashEntry,
  deleteCashEntry,
  restoreCashEntry
} from '../controllers/cashController.js';

const router = Router();

const guard = authorize('employee','admin','superAdmin');
const admin = authorize('admin','superAdmin');

router
  .route('/')
  .post(guard,recordCashEntry)
  .get(guard,getAllCashEntries);

router
  .route('/:id')
  .get(guard,getCashEntryById)
  .put(guard,updateCashEntry)
  .delete(admin,deleteCashEntry);

// Restore a soft-deleted cash entry
router.post('/:id/restore', admin, restoreCashEntry);

export default router;
