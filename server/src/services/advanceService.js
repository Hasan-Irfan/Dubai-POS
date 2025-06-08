// src/services/advanceService.js
import mongoose from 'mongoose';
import SalesmanAdvance from '../models/salesmanAdvance.model.js';
import SalesInvoice     from '../models/salesInvoice.model.js';
import * as cashService from './cashService.js';
import * as bankService from './bankService.js';

/**
 * Record a new advance (cash draw) by a salesman on an invoice.
 * Also increments `salesInvoice.advance.taken` and updates `lastTaken`.
 *
 * @param {Object} params
 * @param {string} params.invoiceId
 * @param {string} params.salesmanId
 * @param {number} params.amount
 * @param {string} [params.note]
 * @param {string} [params.paymentMethod] - 'Cash', 'Bank', or 'Shabka', defaults to 'Cash'
 * @param {string} [params.account] - Required if paymentMethod is 'Bank' or 'Shabka'
 * @param {Object} audit      – { actor, ip, ua } from attachAuditContext
 */
export async function recordAdvance(
  { invoiceId, salesmanId, amount, note = '', paymentMethod = 'Cash', account },
  { actor, ip, ua }
) {
  if (!mongoose.Types.ObjectId.isValid(invoiceId) ||
      !mongoose.Types.ObjectId.isValid(salesmanId)) {
    throw new Error('Invalid invoice or salesman ID');
  }

  // Validate payment method
  if (!['Cash', 'Bank', 'Shabka'].includes(paymentMethod)) {
    throw new Error("Payment method must be 'Cash', 'Bank', or 'Shabka'");
  }

  // Require account for bank methods
  if (paymentMethod !== 'Cash' && !account) {
    throw new Error(`Account information is required for ${paymentMethod} payment method`);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Get invoice details for reference
    const invoice = await SalesInvoice.findById(invoiceId)
      .session(session)
      .setOptions({ actor, ip, ua });
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    // 1) Create the advance record (triggers save hook)
    const advance = await new SalesmanAdvance({
      invoiceId, 
      salesmanId, 
      amount, 
      note,
      paymentMethod,
    }).save({ session, actor, ip, ua });

    // 2) Update the invoice's advance summary (triggers findOneAndUpdate hook)
    await SalesInvoice.findByIdAndUpdate(
      invoiceId,
      {
        $inc: { 'advance.taken': amount },
        $set: { 'advance.lastTaken': advance.date }
      },
      { session, actor, ip, ua }
    );

    // 3) Record the cash or bank outflow
    const reference = `Advance for Invoice ${invoice.invoiceNumber}`;
    if (paymentMethod === 'Cash') {
      await cashService.recordCashEntry({
        date: advance.date,
        type: 'Outflow',
        reference,
        amount
      }, {
        session,
        actor,
        ip,
        ua
      });
    } else {
      // Bank or Shabka payment
      await bankService.recordBankTransaction({
        date: advance.date,
        type: 'Outflow',
        method: paymentMethod,
        reference,
        account,
        amount
      }, {
        session,
        actor,
        ip,
        ua
      });
    }

    await session.commitTransaction();
    return advance.toObject();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * List advances, optionally filtered by salesman and date range,
 * with pagination.
 *
 * @param {Object} opts
 * @param {Object} [opts.filters] - { salesmanId, recovered }
 * @param {Object} [opts.dateRange] - { from, to }
 * @param {string} [opts.search]
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=10]
 */
export async function getAllAdvances({
  filters = {},
  dateRange = {},
  search = '',
  page = 1,
  limit = 10
} = {}, auditContext) {
  const query = { status: 'active' }; // Only show active advances by default
  
  // Apply filters
  if (filters.salesmanId) query.salesmanId = filters.salesmanId;
  if (filters.recovered !== undefined) query.recovered = filters.recovered;
  
  // Apply date range
  if (dateRange.from || dateRange.to) {
    query.date = {};
    if (dateRange.from) query.date.$gte = new Date(dateRange.from);
    if (dateRange.to) query.date.$lte = new Date(dateRange.to);
  }
  
  // Apply search if provided - search by note
  if (search) {
    query.note = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;
  const [ total, advances ] = await Promise.all([
    SalesmanAdvance.countDocuments(query),
    SalesmanAdvance.find(query)
      .populate('salesmanId', 'name contact')
      .populate('invoiceId', 'invoiceNumber date')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .setOptions({
        actor: auditContext.actor,
        ip: auditContext.ip,
        ua: auditContext.ua
      })
      .lean()
  ]);

  return {
    advances,
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
 * Fetch a single advance by ID.
 *
 * @param {string} id
 */
export async function getAdvanceById(id, auditContext) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid advance ID');
  }
  const adv = await SalesmanAdvance.findById(id)
    .populate('salesmanId', 'name contact')
    .populate('invoiceId',   'invoiceNumber date')
    .setOptions({
      actor: auditContext.actor,
      ip: auditContext.ip,
      ua: auditContext.ua
    })
    .lean();
  if (!adv) {
    throw new Error('Advance not found');
  }
  return adv;
}

/**
 * Update an advance's mutable fields.
 *
 * @param {string} id
 * @param {Object} data       – { note?, recovered? }
 */
export async function updateAdvance(
  id,
  { note, recovered },
  { actor, ip, ua }
) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid advance ID');
  }

  // Start a session if recovering advance to handle the financial transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Get the advance record before updating
    const advanceBefore = await SalesmanAdvance.findById(id)
      .session(session)
      .setOptions({ actor, ip, ua });
    
    if (!advanceBefore) {
      throw new Error('Advance not found');
    }
    
    // Check if we're changing the recovered status to true (recovery action)
    const isRecovering = recovered === true && advanceBefore.recovered !== true;
    
    // Prepare updates
    const updates = {};
    if (note !== undefined) updates.note = note;
    if (recovered !== undefined) updates.recovered = recovered;

    // Update the advance record
    const adv = await SalesmanAdvance.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true,
        session,
        actor,
        ip,
        ua
      }
    )
      .populate('salesmanId', 'name contact')
      .populate('invoiceId', 'invoiceNumber date');

    // If we're recovering the advance, record an inflow in the appropriate ledger
    if (isRecovering) {
      const recoveredDate = new Date(); // Use current date for recovery
      const reference = `Recovery of advance for Invoice ${adv.invoiceId.invoiceNumber}`;
      
      // Determine payment method - use the one on record or default to Cash
      const paymentMethod = advanceBefore.paymentMethod || 'Cash';
      
      if (paymentMethod === 'Cash') {
        await cashService.recordCashEntry({
          date: recoveredDate,
          type: 'Inflow',
          reference,
          amount: advanceBefore.amount
        }, {
          session,
          actor,
          ip,
          ua
        });
      } else {
        // Bank or Shabka payment recovery
        await bankService.recordBankTransaction({
          date: recoveredDate,
          type: 'Inflow',
          method: paymentMethod,
          reference,
          amount: advanceBefore.amount
        }, {
          session,
          actor,
          ip,
          ua
        });
      }
    }
    
    await session.commitTransaction();
    return adv.toObject();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * Soft delete an advance record.
 * Also decrements the invoice.advance.taken and resets lastTaken if needed.
 *
 * @param {string} id
 * @param {Object} audit      – { actor, ip, ua }
 */
export async function deleteAdvance(
  id,
  { actor, ip, ua }
) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid advance ID');
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // 1) Load & soft delete the advance
    const adv = await SalesmanAdvance.findByIdAndUpdate(
      id,
      { status: 'deleted' },
      { 
        session, 
        actor, 
        ip, 
        ua,
        new: true 
      }
    );
    if (!adv) throw new Error('Advance not found');

    // 2) Decrement invoice.advance.taken & update lastTaken
    const invoice = await SalesInvoice.findById(adv.invoiceId)
      .session(session)
      .setOptions({ actor, ip, ua });
    if (invoice) {
      // Find the most recent active advance for this invoice (if any)
      const latestAdvance = await SalesmanAdvance.findOne({
        invoiceId: adv.invoiceId,
        status: 'active',
        _id: { $ne: id } // Exclude the one we're deleting
      })
        .sort({ date: -1 })
        .session(session);

      await SalesInvoice.findByIdAndUpdate(
        invoice._id,
        {
          $inc: { 'advance.taken': -adv.amount },
          $set: { 'advance.lastTaken': latestAdvance ? latestAdvance.date : null }
        },
        { session, actor, ip, ua }
      );
    }

    // 3) Create a reversal entry in the appropriate ledger
    const reversalReference = `Reversal of advance for deleted record ID: ${adv._id}`;
    
    // Check if the advance has a paymentMethod field - if it exists and is Bank/Shabka, use bankService
    // Otherwise default to cash (which is the standard for advances)
    if (adv.paymentMethod && ['Bank', 'Shabka'].includes(adv.paymentMethod)) {
      await bankService.recordBankTransaction(
        {
          date: new Date(),
          type: 'Inflow', // Inflow because we're returning the funds
          method: adv.paymentMethod,
          reference: reversalReference,
          amount: adv.amount
        },
        { 
          session,
          actor,
          ip,
          ua
        }
      );
    } else {
      // Default case - treat as cash advance
      await cashService.recordCashEntry(
        {
          date: new Date(),
          type: 'Inflow', // Inflow because we're returning the cash that was taken as an advance
          reference: reversalReference,
          amount: adv.amount
        },
        { 
          session,
          actor,
          ip,
          ua
        }
      );
    }

    await session.commitTransaction();
    return adv;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
