import { Router } from 'express';
import { authorize } from '../middlewares/authorize.js';
import {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  deleteVendor
} from '../controllers/vendorController.js';

const router = Router();

// Admins and superAdmins only
const guard = [  authorize('admin','superAdmin') ];

router
  .route('/')
  .post(...guard, createVendor)
  .get (...guard, getAllVendors);

router
  .route('/:id')
  .get   (...guard, getVendorById)
  .put   (...guard, updateVendor)
  .delete(...guard, deleteVendor);

export default router;
