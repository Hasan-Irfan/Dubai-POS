// src/services/bankService.js
import mongoose from 'mongoose';
import BankTransaction from '../models/bankTransaction.model.js';

/**
 * Record a new bank or Shabka transaction.
 * Automatically computes the running balance.
 *
 * @param {Object} params
 * @param {string} [params.date]
 * @param {string} params.type
 * @param {string} params.method
 * @param {string} params.reference
 * @param {number} params.amount
 * @param {Object} audit         – { actor, ip, ua } from attachAuditContext
 */
export async function recordBankTransaction(
  { date, type, method, reference, amount },
  auditContext
) {
  const { actor, ip, ua, session: externalSession } = auditContext;
  // Use existing session if provided, otherwise create one
  let session = externalSession;
  let ownSession = false;
  if (!session) {
    session = await mongoose.startSession();
    session.startTransaction();
    ownSession = true;
  }

  // Validate required fields
  if (!reference) {
    throw new Error('Reference is required');
  }
  if (amount === undefined || amount === null) {
    throw new Error('Amount is required');
  }
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Amount must be a valid number');
  }
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  if (!['Opening','Inflow','Outflow'].includes(type)) {
    throw new Error('Type must be "Opening", "Inflow", or "Outflow"');
  }
  if (!['Bank','Shabka'].includes(method)) {
    throw new Error('Method must be "Bank" or "Shabka"');
  }

  try {
    // Check if we're trying to create an Opening type entry
    if (type === 'Opening') {
      // Check if an Opening entry already exists
      const existingOpening = await BankTransaction.findOne({ 
        type: 'Opening',
        status: 'active'
      }).session(session);
      
      if (existingOpening) {
        throw new Error('An opening balance entry already exists. Only one opening balance is allowed.');
      }
    }

    // 1) Get last balance
    const last = await BankTransaction.findOne({ status: 'active' })
      .sort({ date: -1 })
      .session(session);

    const lastBalance = last ? last.balance : 0;

    // 2) Compute new balance
    let newBalance;
    if (type === 'Opening') {
      newBalance = amount;
    } else {
      newBalance = type === 'Inflow'
        ? lastBalance + amount
        : lastBalance - amount;
    }

    // 3) Create the transaction
    const txn = new BankTransaction({
      date:      date ? new Date(date) : new Date(),
      type,
      method,
      reference,
      amount,
      balance:   newBalance
    });

    // Attach audit metadata via $locals.audit
    txn.$locals = txn.$locals || {};
    txn.$locals.audit = {
      actorId:    actor.id,
      actorModel: actor.model,
      ip:         ip,
      ua:         ua
    };

    // Save under the session so auditPlugin sees $locals.audit
    const saved = await txn.save({ session });

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
 * List bank transactions with optional filters & pagination.
 *
 * @param {Object} opts
 * @param {string} [opts.method]
 * @param {string} [opts.from]
 * @param {string} [opts.to]
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=10]
 * @param {boolean} [opts.includeDeleted=false] - Whether to include soft-deleted entries
 */
export async function getAllBankTransactions({
  method,
  from,
  to,
  page  = 1,
  limit = 10,
  includeDeleted = false
} = {}) {
  const query = {};
  if (method)  query.method  = method;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to)   query.date.$lte = new Date(to);
  }
  
  // Only include active entries unless specifically requested
  if (!includeDeleted) {
    query.status = 'active';
  }

  const skip = (page - 1) * limit;
  const [ total, txns ] = await Promise.all([
    BankTransaction.countDocuments(query),
    BankTransaction.find(query)
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
    transactions: txns,
    pagination: {
      total,
      page,
      limit,
      totalPages:  Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
}

/**
 * Fetch one bank transaction by ID.
 *
 * @param {string} id
 * @param {boolean} [includeDeleted=false] - Whether to include soft-deleted entries
 */
export async function getBankTransactionById(id, includeDeleted = false) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid transaction ID');
  }
  
  const query = { _id: id };
  if (!includeDeleted) {
    query.status = 'active';
  }
  
  const txn = await BankTransaction.findOne(query).lean();
  if (!txn) {
    throw new Error('Transaction not found');
  }
  return txn;
}

/**
 * Update only the reference text of a bank transaction.
 * (Balances are not recalculated on update.)
 *
 * @param {string} id
 * @param {Object} data     – { reference }
 * @param {Object} audit    – { actor, ip, ua }
 */
export async function updateBankTransaction(
  id,
  { reference },
  { actor, ip, ua }
) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid transaction ID');
  }

  const txn = await BankTransaction.findOne({ _id: id, status: 'active' });
  if (!txn) {
    throw new Error('Transaction not found or has been deleted');
  }

  // Only update reference if it's provided, otherwise keep the existing one
  if (reference !== undefined) {
    txn.reference = reference;
  }

  // Attach audit metadata via $locals.audit
  txn.$locals = txn.$locals || {};
  txn.$locals.audit = {
    actorId:    actor.id,
    actorModel: actor.model,
    ip:         ip,
    ua:         ua
  };

  const updated = await txn.save();
  return updated.toObject();
}

/**
 * Soft delete a bank transaction.
 * Recalculates all subsequent balances.
 *
 * @param {string} id
 * @param {Object} auditContext         – { actor, ip, ua } from attachAuditContext
 */
export async function deleteBankTransaction(id, auditContext) {
  const { actor, ip, ua, session: externalSession } = auditContext;

  // Validate basic actor presence and type
  if (!actor?.id || !['User', 'Employee'].includes(actor.model)) {
    throw new Error('Invalid actor context');
  }

  // Validate transaction ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid transaction ID');
  }

  // Use existing session if provided, otherwise create one
  let session = externalSession;
  let ownSession = false;
  if (!session) {
    session = await mongoose.startSession();
    session.startTransaction();
    ownSession = true;
  }

  try {
    // 1) Fetch the transaction to delete
    const txn = await BankTransaction.findOne({ _id: id, status: 'active' }).session(session);
    if (!txn) {
      throw new Error('Transaction not found or has been deleted');
    }

    // 2) Prevent deletion of opening balance if later entries exist
    if (txn.type === 'Opening') {
      const laterTxns = await BankTransaction.findOne({
        date: { $gt: txn.date },
        status: 'active'
      }).session(session);

      if (laterTxns) {
        throw new Error('Cannot delete opening balance when there are later transactions');
      }
    }

    // 3) Soft delete the transaction
    txn.status = 'deleted';

    // Set audit metadata
    txn.$locals = txn.$locals || {};
    txn.$locals.audit = {
      actorId: actor.id,
      actorModel: actor.model,
      ip,
      ua
    };

    await txn.save({ session });

    // 4) Recalculate balances of all subsequent entries
    const subsequent = await BankTransaction.find({
      date: { $gt: txn.date },
      status: 'active'
    })
      .sort({ date: 1 })
      .session(session);

    const previous = await BankTransaction.findOne({
      date: { $lt: txn.date },
      status: 'active'
    })
      .sort({ date: -1 })
      .session(session);

    let runningBalance = previous ? previous.balance : 0;

    for (const next of subsequent) {
      if (next.type === 'Opening') {
        runningBalance = next.amount;
      } else {
        runningBalance = next.type === 'Inflow'
          ? runningBalance + next.amount
          : runningBalance - next.amount;
      }

      next.balance = runningBalance;

      next.$locals = next.$locals || {};
      next.$locals.audit = {
        actorId: actor.id,
        actorModel: actor.model,
        ip,
        ua
      };

      await next.save({ session });
    }

    // Commit if we started the session
    if (ownSession) {
      await session.commitTransaction();
    }

    return txn.toObject();
  } catch (err) {
    if (ownSession) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (ownSession) {
      session.endSession();
    }
  }
}

export async function recalculateBalancesFromDate(startDate, session, auditContext) {
  // Find the last entry before startDate
  const previous = await BankTransaction.findOne({
    date: { $lt: startDate },
    status: 'active'
  }).sort({ date: -1 }).session(session);

  let running = previous ? previous.balance : 0;

  // Get all entries from startDate onwards, sorted by date
  const entries = await BankTransaction.find({
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
