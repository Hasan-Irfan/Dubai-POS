// src/routes/advanceRoutes.js
import { Router } from 'express';
import { authorize } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';
import {
  recordAdvance,
  getAllAdvances,
  getAdvanceById,
  updateAdvance,
  deleteAdvance
} from '../controllers/advanceController.js';
import {
  createAdvanceSchema,
  listAdvancesSchema,
  updateAdvanceSchema
} from '../validators/advance.validator.js';

const router = Router();

// Anyone logged-in (employee+) can record, list, view, update advances
const guardBasic = [authorize('employee','admin','superAdmin')];
// Only admin+ can delete
const guardAdmin = [authorize('admin','superAdmin')];

router
  .route('/')
  .post(...guardBasic, validate(createAdvanceSchema), recordAdvance)
  .get(...guardBasic, validate(listAdvancesSchema, 'query'), getAllAdvances);

router
  .route('/:id')
  .get(...guardBasic, getAdvanceById)
  .put(...guardBasic, validate(updateAdvanceSchema), updateAdvance)
  .delete(...guardAdmin, deleteAdvance);

export default router;
