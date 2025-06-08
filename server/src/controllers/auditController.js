import { asyncHandler } from '../utils/asyncHandler.js';
import * as auditService from '../services/auditService.js';

/**
 * GET /api/v1/audit
 * Query: page, limit, actorId, actorModel, action, collectionName, documentId, from, to
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    page           = 1,
    limit          = 10,
    actorId,
    actorModel,
    action,
    collectionName,
    documentId,
    from,
    to
  } = req.query;

  const result = await auditService.getAuditLogs({
    filters: {
      actorId,
      actorModel,
      action,
      collectionName,
      documentId
    },
    from,
    to,
    page:  Number(page),
    limit: Number(limit)
  });

  res.status(200).json({ success: true, ...result });
});

/**
 * GET /api/v1/audit/:id
 */
export const getAuditLogById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const log = await auditService.getAuditLogById(id);
  res.status(200).json({ success: true, log });
});
