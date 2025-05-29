// src/services/auditService.js
import mongoose from 'mongoose';
import AuditLog from '../models/auditLog.model.js';
import User from '../models/user.model.js';
import Employee from '../models/employee.model.js';

/**
 * Log an audit entry.
 *
 * @param {Object} params
 * @param {string} params.actorId         – ObjectId of the actor (User or Employee)
 * @param {string} params.actorModel      – 'User' or 'Employee'
 * @param {string} params.action          – 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
 * @param {string} params.collectionName  – name of the collection changed
 * @param {string} params.documentId      – ObjectId of the document affected
 * @param {Object} [params.before]        – snapshot before change
 * @param {Object} [params.after]         – snapshot after change
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @returns {Promise<Object>}             – the saved audit log entry
 */
export async function logAction({
  actorId,
  actorModel,
  action,
  collectionName,
  documentId,
  before = null,
  after = null,
  ipAddress = null,
  userAgent = null
}) {
  // validate IDs
  if (!mongoose.Types.ObjectId.isValid(actorId)) {
    throw new Error('Invalid actorId');
  }
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new Error('Invalid documentId');
  }

  const entry = new AuditLog({
    actorId,
    actorModel,
    action,
    collectionName,
    documentId,
    before,
    after,
    ipAddress,
    userAgent
  });
  const saved = await entry.save();
  return saved.toObject();
}

/**
 * Fetch a single audit log entry by its ID.
 *
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function getAuditLogById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid audit log ID');
  }
  const log = await AuditLog.findById(id).lean();
  if (!log) {
    throw new Error('Audit log entry not found');
  }
  return log;
}

/**
 * Query audit log entries with filters, date range, and pagination.
 *
 * @param {Object} opts
 * @param {string} [opts.actorId]
 * @param {string} [opts.actorModel]
 * @param {string} [opts.action]
 * @param {string} [opts.collectionName]
 * @param {string} [opts.documentId]
 * @param {string} [opts.from]   – ISO date string
 * @param {string} [opts.to]     – ISO date string
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=10]
 * @returns {Promise<Object>}    – { logs: Array, pagination: { total, page, limit, totalPages, hasNextPage, hasPrevPage } }
 */
export async function getAuditLogs({
  actorId,
  actorModel,
  action,
  collectionName,
  documentId,
  from,
  to,
  page = 1,
  limit = 10
} = {}) {
  const query = {};
  if (actorId)        query.actorId        = actorId;
  if (actorModel)     query.actorModel     = actorModel;
  if (action)         query.action         = action;
  if (collectionName) query.collectionName = collectionName;
  if (documentId)     query.documentId     = documentId;
  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to)   query.timestamp.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;
  const [ total, logs ] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  // Fetch actor details for each log
  const enhancedLogs = await Promise.all(logs.map(async (log) => {
    let actorDetails = null;
    
    if (log.actorModel === 'User') {
      actorDetails = await User.findById(log.actorId).select('username').lean();
    } else if (log.actorModel === 'Employee') {
      actorDetails = await Employee.findById(log.actorId).select('name').lean();
    }

    return {
      ...log,
      actorDetails: actorDetails || { name: 'Unknown', username: 'Unknown' }
    };
  }));

  const totalPages = Math.ceil(total / limit);
  return {
    logs: enhancedLogs,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}
