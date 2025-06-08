import { Router } from 'express';
import { authorize } from '../middlewares/authorize.js';
import {
  getAuditLogs,
  getAuditLogById
} from '../controllers/auditController.js';

const router = Router();

// Only admins and superAdmins can view audit logs
router
  .route('/')
  .get(
    authorize('admin', 'superAdmin'),
    getAuditLogs
  );

router
  .route('/:id')
  .get(
    authorize('admin', 'superAdmin'),
    getAuditLogById
  );

export default router;
