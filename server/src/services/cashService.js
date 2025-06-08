// src/services/cashService.js
import mongoose from 'mongoose';
import CashRegister from '../models/cashRegister.model.js';
import ApiError from '../utils/ApiError.js';

/**
 * Record a new cash register entry (Opening, Inflow, or Outflow).
 * Automatically computes the running balance.
 *
 * @param {Object} params
 * @param {string} [params.date]      – ISO date string; defaults to now
 * @param {string} params.type        – "Opening" | "Inflow" | "Outflow"
 * @param {string} params.reference   – free-text description
 * @param {number} params.amount
 */
export async function recordCashEntry(
  { date, type, reference, amount },
  auditContext
) {
  if (!['Opening','Inflow','Outflow'].includes(type)) {
    throw new Error('Type must be "Opening", "Inflow", or "Outflow"');
  }
  // Use existing session if provided, otherwise create one
  let session = auditContext.session;
  let ownSession = false;
  if (!session) {
    session = await mongoose.startSession();
    session.startTransaction();
    ownSession = true;
  }
  try {
    // Check if we're trying to create an Opening type entry
    if (type === 'Opening') {
      // Check if an Opening entry already exists
      const existingOpening = await CashRegister.findOne({ 
        type: 'Opening',
        status: 'active'
      }).session(session);
      if (existingOpening) {
        throw new Error('An opening balance entry already exists. Only one opening balance is allowed.');
      }
    }
    
    // 1) Determine last balance
    const last = await CashRegister.findOne({ status: 'active' })
      .sort({ date: -1 })
      .session(session);
    const lastBalance = last ? last.balance : 0;
    // 2) Compute new balance
    let newBalance;
    if (type === 'Opening') newBalance = amount;
    else if (type === 'Inflow') newBalance = lastBalance + amount;
    else newBalance = lastBalance - amount;
    // 3) Create the entry
    const entry = new CashRegister({
      date: date ? new Date(date) : new Date(),
      type,
      reference,
      amount,
      balance: newBalance,
      status: 'active'
    });
    
    // Attach audit metadata via $locals.audit
    entry.$locals = entry.$locals || {};
    entry.$locals.audit = {
      actorId:    auditContext.actor.id,
      actorModel: auditContext.actor.model,
      ip:         auditContext.ip,
      ua:         auditContext.ua
    };
    
    // Save under the session so auditPlugin sees $locals.audit
    const saved = await entry.save({ session });
    
    // Commit if we started the session
    if (ownSession) {
      await session.commitTransaction();
    }
    return saved.toObject();
  } catch (err) {
    if (ownSession) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (ownSession) session.endSession();
  }
}

/**
 * List cash register entries, with optional date range and type filter,
 * plus pagination.
 *
 * @param {Object} opts
 * @param {string} [opts.from]   – ISO date string
 * @param {string} [opts.to]     – ISO date string
 * @param {string} [opts.type]   – "Opening" | "Inflow" | "Outflow"
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=10]
 * @param {boolean} [opts.includeDeleted=false] - Whether to include soft-deleted entries
 */
export async function getAllCashEntries({
  from,
  to,
  type,
  page = 1,
  limit = 10,
  includeDeleted = false
} = {}) {
  const query = {};
  if (type) query.type = type;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }
  
  // Only include active entries unless specifically requested
  if (!includeDeleted) {
    query.status = 'active';
  }

  const skip = (page - 1) * limit;
  const [total, entries] = await Promise.all([
    CashRegister.countDocuments(query),
    CashRegister.find(query)
      .sort({ 
        date: -1, // Sort by date descending (newest first)
        // For entries on the same date, sort Opening last (after Inflow/Outflow)
        type: -1 // This works because 'Opening' comes after 'Inflow'/'Outflow' alphabetically when sorted descending
      })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return {
    entries,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
}

/**
 * Fetch a single cash entry by ID.
 *
 * @param {string} id
 * @param {boolean} [includeDeleted=false] - Whether to include soft-deleted entries
 */
export async function getCashEntryById(id, includeDeleted = false) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid cash entry ID');
  }
  
  const query = { _id: id };
  if (!includeDeleted) {
    query.status = 'active';
  }
  
  const entry = await CashRegister.findOne(query).lean();
  if (!entry) {
    throw new Error('Cash entry not found');
  }
  return entry;
}

/**
 * Update only the reference text of a cash entry.
 *
 * @param {string} id
 * @param {Object} data – { reference }
 */
export async function updateCashEntry(id, { reference }, auditContext) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid cash entry ID');
  }
  
  // First find the entry to update
  const entry = await CashRegister.findOne({ _id: id, status: 'active' });
  if (!entry) {
    throw new Error('Cash entry not found or has been deleted');
  }
  
  // Update the reference
  entry.reference = reference;
  
  // Attach audit metadata via $locals.audit
  entry.$locals = entry.$locals || {};
  entry.$locals.audit = {
    actorId:    auditContext.actor.id,
    actorModel: auditContext.actor.model,
    ip:         auditContext.ip,
    ua:         auditContext.ua
  };
  
  // Save the updated entry
  const updatedEntry = await entry.save();
  return updatedEntry.toObject();
}

/**
 * Soft delete a cash entry and re-calculate subsequent running balances.
 *
 * @param {string} id
 */
export async function deleteCashEntry(id, auditContext) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid cash entry ID');
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // 1) Fetch the target entry
    const toDelete = await CashRegister.findOne({ _id: id, status: 'active' }).session(session);
    if (!toDelete) throw new Error('Cash entry not found or has been deleted');
    
    // Check if entry is an opening balance
    if (toDelete.type === 'Opening') {
      // Get all entries after this one
      const laterEntries = await CashRegister.countDocuments({
        date: { $gt: toDelete.date },
        status: 'active'
      }).session(session);
      
      if (laterEntries > 0) {
        throw new Error('Cannot delete opening balance entry when later entries exist');
      }
    }
    
    // Store entry info before soft deletion
    const deletedEntry = toDelete.toObject();
    
    // Soft delete by changing status
    toDelete.status = 'deleted';
    
    // Attach audit metadata via $locals.audit
    toDelete.$locals = toDelete.$locals || {};
    toDelete.$locals.audit = {
      actorId:    auditContext.actor.id,
      actorModel: auditContext.actor.model,
      ip:         auditContext.ip,
      ua:         auditContext.ua
    };
    
    // Save the updated status
    await toDelete.save({ session });

    // 3) Find all entries that need balance recalculation
    // Only recalculate active entries with a date >= the deleted entry's date
    const entries = await CashRegister.find({
      date: { $gte: deletedEntry.date },
      status: 'active'
    })
      .sort({ date: 1 })
      .session(session);
      
    if (entries.length === 0) {
      // No entries to recalculate
      await session.commitTransaction();
      return deletedEntry;
    }
    
    // 4) Find the last active entry before the deleted one to get starting balance
    const previousEntry = await CashRegister.findOne({
      date: { $lt: deletedEntry.date },
      status: 'active'
    })
      .sort({ date: -1 })
      .session(session);
    
    // Start with previous balance or 0 if no previous entry
    let running = previousEntry ? previousEntry.balance : 0;
    
    // 5) Recalculate all balances after the deleted entry
    for (const e of entries) {
      if (e.type === 'Opening') {
        running = e.amount;
      } else if (e.type === 'Inflow') {
        running += e.amount;
      } else if (e.type === 'Outflow') {
        running -= e.amount;
      }
      
      // Update the balance while preserving audit tracking
      e.balance = running;
      
      // Attach audit metadata via $locals.audit
      e.$locals = e.$locals || {};
      e.$locals.audit = {
        actorId:    auditContext.actor.id,
        actorModel: auditContext.actor.model,
        ip:         auditContext.ip,
        ua:         auditContext.ua
      };
      
      await e.save({ session });
    }

    await session.commitTransaction();
    return deletedEntry;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * Restore a soft-deleted cash entry.
 *
 * @param {string} id
 */
export async function restoreCashEntry(id, auditContext) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid cash entry ID');
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // 1) Fetch the deleted entry
    const toRestore = await CashRegister.findOne({ _id: id, status: 'deleted' }).session(session);
    if (!toRestore) throw new Error('Deleted cash entry not found');
    
    // 2) Restore the entry
    toRestore.status = 'active';
    
    // Attach audit metadata
    toRestore.$locals = toRestore.$locals || {};
    toRestore.$locals.audit = {
      actorId:    auditContext.actor.id,
      actorModel: auditContext.actor.model,
      ip:         auditContext.ip,
      ua:         auditContext.ua
    };
    
    await toRestore.save({ session });
    
    // 3) Recalculate balances for all entries including and after this one
    const entries = await CashRegister.find({
      date: { $gte: toRestore.date },
      status: 'active'
    })
      .sort({ date: 1 })
      .session(session);
    
    // Find the previous active entry to get the starting balance
    const previousEntry = await CashRegister.findOne({
      date: { $lt: toRestore.date },
      status: 'active'
    })
      .sort({ date: -1 })
      .session(session);
    
    let running = previousEntry ? previousEntry.balance : 0;
    
    // Recalculate all balances
    for (const e of entries) {
      if (e.type === 'Opening') {
        running = e.amount;
      } else if (e.type === 'Inflow') {
        running += e.amount;
      } else if (e.type === 'Outflow') {
        running -= e.amount;
      }
      
      // Update balance and audit
      e.balance = running;
      e.$locals = e.$locals || {};
      e.$locals.audit = {
        actorId:    auditContext.actor.id,
        actorModel: auditContext.actor.model,
        ip:         auditContext.ip,
        ua:         auditContext.ua
      };
      
      await e.save({ session });
    }
    
    await session.commitTransaction();
    return toRestore.toObject();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function recalculateBalancesFromDate(startDate, session, auditContext) {
  // Find the last entry before startDate
  const previous = await CashRegister.findOne({
    date: { $lt: startDate },
    status: 'active'
  }).sort({ date: -1 }).session(session);

  let running = previous ? previous.balance : 0;

  // Get all entries from startDate onwards, sorted by date
  const entries = await CashRegister.find({
    date: { $gte: startDate },
    status: 'active'
  }).sort({ date: 1 }).session(session);

  for (const e of entries) {
    if (e.type === 'Opening') running = e.amount;
    else if (e.type === 'Inflow') running += e.amount;
    else if (e.type === 'Outflow') running -= e.amount;
    e.balance = running;
    // Set audit context for recalculation
    e.$locals = e.$locals || {};
    e.$locals.audit = auditContext || {
      actorId: 'system',
      actorModel: 'System',
      ip: '127.0.0.1',
      ua: 'balance-recalc'
    };
    await e.save({ session });
  }
}
