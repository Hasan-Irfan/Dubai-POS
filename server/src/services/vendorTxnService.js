// src/services/vendorTxnService.js
import mongoose from 'mongoose';
import VendorTransaction from '../models/vendorTransaction.model.js';
import Vendor from '../models/vendor.model.js';
import * as expenseService from './expenseService.js';
import * as cashService from './cashService.js';
import * as bankService from './bankService.js';

/**
 * Record a purchase or payment for a vendor.
 * For Purchase: Only records the transaction and updates balance
 * For Payment: Records transaction, updates balance, and updates cash/bank registers
 *
 * @param {Object} params
 * @param {string} params.vendorId
 * @param {string} params.type         – "Purchase" or "Payment"
 * @param {string} params.description
 * @param {number} params.amount
 * @param {string} params.method       – Required for Payment type only
 * @param {Object} auditContext        – { actor, ip, ua }
 */
export async function addVendorTransaction(
  { vendorId, type, description, amount, method },
  auditContext
) {
  // Validate vendorId and type
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw new Error('Invalid vendor ID');
  }
  if (!['Purchase','Payment'].includes(type)) {
    throw new Error('Type must be "Purchase" or "Payment"');
  }

  // Validate method is provided for Payment type
  if (type === 'Payment') {
    if (!method) {
      throw new Error('Payment method is required for Payment type');
    }
    if (!['Cash', 'Bank','Shabka'].includes(method)) {
      throw new Error('Payment method must be either Cash or Bank or Shabka');
    }
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
    // Load vendor for balance and name
    const vendor = await Vendor.findById(vendorId)
      .session(session)
      .setOptions({ actor: auditContext.actor, ip: auditContext.ip, ua: auditContext.ua });
    if (!vendor) throw new Error('Vendor not found');

    // Determine new payable balance
    const lastTxn = await VendorTransaction.findOne({ vendorId, status: 'active' })
      .sort({ date: -1 })
      .session(session)
      .setOptions({ actor: auditContext.actor, ip: auditContext.ip, ua: auditContext.ua });
    const lastBalance = lastTxn ? lastTxn.balance : vendor.openingBalance;
    const newBalance = type === 'Purchase'
      ? lastBalance + amount
      : lastBalance - amount;

    // Create vendor transaction
    const txn = new VendorTransaction({ 
      vendorId, 
      type,
      method: type === 'Payment' ? method : undefined, // Only set method for Payment type
      description, 
      amount, 
      balance: newBalance 
    });

    // Attach audit metadata via $locals.audit
    txn.$locals = txn.$locals || {};
    txn.$locals.audit = {
      actorId: auditContext.actor.id,
      actorModel: auditContext.actor.model,
      ip: auditContext.ip,
      ua: auditContext.ua
    };

    // Save under the session so auditPlugin sees $locals.audit
    const saved = await txn.save({ session });

    // For Payment type only: Record ledger entry and link it
    if (type === 'Payment') {
      const reference = `Vendor Payment - ${vendor.name}`;
      
      if (method === 'Cash') {
        const cashEntry = await cashService.recordCashEntry(
          { date: txn.date, type: 'Outflow', reference, amount },
          { 
            session, 
            actor: auditContext.actor, 
            ip: auditContext.ip, 
            ua: auditContext.ua 
          }
        );
        // Link ledger entry
        await VendorTransaction.findByIdAndUpdate(
          txn._id,
          { ledgerEntryId: cashEntry._id, ledgerEntryModel: 'CashRegister' },
          { 
            session, 
            actor: auditContext.actor, 
            ip: auditContext.ip, 
            ua: auditContext.ua 
          }
        );
      } else if (method === 'Bank') {
        const bankEntry = await bankService.recordBankTransaction(
          { date: txn.date, type: 'Outflow', method, reference, amount },
          { 
            session, 
            actor: auditContext.actor, 
            ip: auditContext.ip, 
            ua: auditContext.ua 
          }
        );
        // Link ledger entry
        await VendorTransaction.findByIdAndUpdate(
          txn._id,
          { ledgerEntryId: bankEntry._id, ledgerEntryModel: 'BankTransaction' },
          { 
            session, 
            actor: auditContext.actor, 
            ip: auditContext.ip, 
            ua: auditContext.ua 
          }
        );
      }
    }

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
    if (ownSession) {
      session.endSession();
    }
  }
}

/**
 * List vendor transactions with optional filters & pagination.
 *
 * @param {Object} opts
 * @param {string} [opts.vendorId]
 * @param {string} [opts.from]   – ISO date string
 * @param {string} [opts.to]     – ISO date string
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=10]
 */
export async function getAllVendorTransactions({
  vendorId,
  from,
  to,
  page  = 1,
  limit = 10
} = {}) {
  const query = { status: 'active' };
  if (vendorId) {
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      throw new Error('Invalid vendor ID');
    }
    query.vendorId = vendorId;
  }
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to)   query.date.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;
  const [ total, txns ] = await Promise.all([
    VendorTransaction.countDocuments(query),
    VendorTransaction.find(query)
      .populate('vendorId', 'name contact')
      .sort({ date: -1 })
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
 * Get one vendor transaction by ID.
 * @param {string} id
 */
export async function getVendorTransactionById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid transaction ID');
  }
  const txn = await VendorTransaction.findById(id)
    .populate('vendorId', 'name contact')
    .lean();
  if (!txn) throw new Error('Transaction not found');
  return txn;
}

/**
 * Update only the description of a vendor transaction.
 * @param {string} id
 * @param {Object} data – { description }
 * @param {Object} auditContext  – { actor, ip, ua }
 */
export async function updateVendorTransaction(id, { description }, auditContext) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid transaction ID');
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
    const txn = await VendorTransaction.findById(id).session(session);
    if (!txn) throw new Error('Transaction not found');

    txn.description = description;

    // Attach audit metadata via $locals.audit
    txn.$locals = txn.$locals || {};
    txn.$locals.audit = {
      actorId: auditContext.actor.id,
      actorModel: auditContext.actor.model,
      ip: auditContext.ip,
      ua: auditContext.ua
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
    if (ownSession) {
      session.endSession();
    }
  }
}

/**
 * Soft delete a vendor transaction and recalculate subsequent balances.
 * For Purchase: Simply marks as deleted
 * For Payment: Reverses the cash/bank entry and marks as deleted
 * 
 * @param {string} id
 * @param {Object} auditContext  – { actor, ip, ua }
 */
export async function deleteVendorTransaction(id, auditContext) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid transaction ID');
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
    // 1. Get the transaction to be deleted
    const toDelete = await VendorTransaction.findById(id)
      .populate('vendorId', 'name')
      .session(session);
    if (!toDelete) throw new Error('Transaction not found');
    if (toDelete.status === 'deleted') throw new Error('Transaction is already deleted');

    const { vendorId, type } = toDelete;

    // 2. Soft delete the transaction
    toDelete.status = 'deleted';
    toDelete.$locals = toDelete.$locals || {};
    toDelete.$locals.audit = {
      actorId: auditContext.actor.id,
      actorModel: auditContext.actor.model,
      ip: auditContext.ip,
      ua: auditContext.ua
    };

    await toDelete.save({ session });

    // 3. For Payment transactions, reverse the cash/bank transaction
    if (type === 'Payment' && toDelete.ledgerEntryId && toDelete.ledgerEntryModel) {
      const reference = `Reversal of payment to ${toDelete.vendorId.name} (deleted transaction)`;
      
      if (toDelete.method === 'Cash') {
        // Create an inflow to reverse the outflow
        await cashService.recordCashEntry(
          {
            date: new Date(),
            type: 'Inflow',
            reference,
            amount: toDelete.amount
          },
          {
            session,
            actor: auditContext.actor,
            ip: auditContext.ip,
            ua: auditContext.ua
          }
        );
      } else if (toDelete.method === 'Bank' || toDelete.method === 'Shabka') {
        // Create a bank inflow to reverse the outflow
        await bankService.recordBankTransaction(
          {
            date: new Date(),
            type: 'Inflow',
            method: toDelete.method,
            reference,
            amount: toDelete.amount
          },
          {
            session,
            actor: auditContext.actor,
            ip: auditContext.ip,
            ua: auditContext.ua
          }
        );
      }
    }

    // 4. Recalculate balances for all remaining active transactions for this vendor
    const txns = await VendorTransaction
      .find({ vendorId, status: 'active' })
      .sort({ date: 1 })
      .session(session);

    // Start from openingBalance
    const vendor = await Vendor.findById(vendorId).session(session);
    let running = vendor.openingBalance;

    for (const t of txns) {
      running = t.type === 'Purchase'
        ? running + t.amount
        : running - t.amount;

      t.balance = running;
      t.$locals = t.$locals || {};
      t.$locals.audit = {
        actorId: auditContext.actor.id,
        actorModel: auditContext.actor.model,
        ip: auditContext.ip,
        ua: auditContext.ua
      };

      await t.save({ session });
    }

    // Commit if we started the session
    if (ownSession) {
      await session.commitTransaction();
    }
    return toDelete.toObject();
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