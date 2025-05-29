// src/services/expenseService.js
import mongoose from 'mongoose';
import Expense from '../models/expense.model.js';
import CashRegister from '../models/cashRegister.model.js';
import * as cashService from './cashService.js';
import * as bankService from './bankService.js';

/**
 * Record a new expense or expense reversal.
 * @param {Object} data
 * @param {string} [data.date]           – ISO date string (defaults to now)
 * @param {string} data.category         – one of ['Rent','Utilities','Salaries','Commissions','Advances Recovered','Inventory','Miscellaneous']
 * @param {string} data.description      – Free-text explanation of the expense
 * @param {number} data.amount           – Positive number for normal expenses, negative for reversals
 * @param {string} data.paymentType      – one of ['Cash','Bank','Shabka']
 * @param {string} [data.paidTo]         – ObjectId of Employee or Vendor
 * @param {string} [data.paidToModel]    – 'Employee' or 'Vendor'
 * @param {string} [data.linkedTo]       – ObjectId of SalesInvoice or SalesmanAdvance
 * @param {string} [data.linkedToModel]  – 'SalesInvoice' or 'SalesmanAdvance'
 */
export async function recordExpense(data, auditContext) {
  // Validate required fields
  if (!data.category) {
    throw new Error('Category is required');
  }
  if (!data.description) {
    throw new Error('Description is required');
  }
  if (data.amount === undefined || data.amount === null) {
    throw new Error('Amount is required');
  }
  if (!data.paymentType) {
    throw new Error('Payment type is required');
  }
  
  // Validate field values
  const validCategories = ['Rent','Utilities','Salaries','Commissions','Advances Recovered','Inventory','Miscellaneous'];
  if (!validCategories.includes(data.category)) {
    throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }
  
  const validPaymentTypes = ['Cash','Bank','Shabka'];
  if (!validPaymentTypes.includes(data.paymentType)) {
    throw new Error(`Invalid payment type. Must be one of: ${validPaymentTypes.join(', ')}`);
  }
  

  // If paidTo is provided, paidToModel is required
  if (data.paidTo) {
    if (!data.paidToModel) {
      throw new Error('paidToModel is required when paidTo is provided');
    }
    if (!['Employee','Vendor'].includes(data.paidToModel)) {
      throw new Error('paidToModel must be "Employee" or "Vendor"');
    }
    if (!mongoose.Types.ObjectId.isValid(data.paidTo)) {
      throw new Error('Invalid paidTo ID');
    }
  }
  
  // If linkedTo is provided, linkedToModel is required
  if (data.linkedTo) {
    if (!data.linkedToModel) {
      throw new Error('linkedToModel is required when linkedTo is provided');
    }
    if (!['SalesInvoice','SalesmanAdvance'].includes(data.linkedToModel)) {
      throw new Error('linkedToModel must be "SalesInvoice" or "SalesmanAdvance"');
    }
    if (!mongoose.Types.ObjectId.isValid(data.linkedTo)) {
      throw new Error('Invalid linkedTo ID');
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
  
  // Check for opening balances based on payment type
  if (data.paymentType === 'Cash') {
    // Check if cash opening balance exists
    const cashOpening = await CashRegister.findOne({ 
      type: 'Opening',
      status: 'active'
    }).session(session);
    
    if (!cashOpening) {
      throw new Error('Cash opening balance is required before recording cash expenses. Please create a cash opening balance first.');
    }
  } else if (data.paymentType === 'Bank' || data.paymentType === 'Shabka') {
    // Check if bank opening balance exists
    const BankTransaction = mongoose.model('BankTransaction');
    const bankOpening = await BankTransaction.findOne({ 
      type: 'Opening',
      status: 'active'
    }).session(session);
    
    if (!bankOpening) {
      throw new Error(`${data.paymentType} opening balance is required before recording ${data.paymentType.toLowerCase()} expenses. Please create a ${data.paymentType.toLowerCase()} opening balance first.`);
    }
  }
  
  try {
    // Create the expense record
    const expense = new Expense({
      date: data.date ? new Date(data.date) : new Date(),
      category: data.category,
      description: data.description,
      amount: data.amount,
      paymentType: data.paymentType,
      paidTo: data.paidTo,
      paidToModel: data.paidToModel,
      linkedTo: data.linkedTo,
      linkedToModel: data.linkedToModel
    });
    // Attach audit metadata via $locals.audit
    expense.$locals = expense.$locals || {};
    expense.$locals.audit = {
      actorId:    auditContext.actor.id,
      actorModel: auditContext.actor.model,
      ip:         auditContext.ip,
      ua:         auditContext.ua
    };
    
    // Save the expense with audit context
    const saved = await expense.save({ 
      session,
      actor: auditContext.actor,
      ip: auditContext.ip,
      ua: auditContext.ua
    });
    
    // Determine the ledger entry type (Inflow or Outflow)
    const entryType = data.amount < 0 ? 'Inflow' : 'Outflow';
    const entryAmount = Math.abs(data.amount);
    const reference = `Expense: ${data.description}`;
    
    // Record the ledger entry (cash or bank)
    let ledgerEntry;
    
    if (data.paymentType === 'Cash') {
      ledgerEntry = await cashService.recordCashEntry(
        {
          date: data.date || new Date(),
          type: entryType,
          reference: reference,
          amount: entryAmount
        },
        {
          session,
          actor: auditContext.actor,
          ip: auditContext.ip,
          ua: auditContext.ua
        }
      );
      
      // Store reference to the ledger entry
      saved.ledgerEntryId = ledgerEntry._id;
      saved.ledgerEntryModel = 'CashRegister';
      // Recalculate balances for all subsequent cash entries, except for Opening
      if (ledgerEntry.type !== 'Opening') {
        await cashService.recalculateBalancesFromDate(
          ledgerEntry.date,
          session,
          {
            actorId: auditContext.actor.id,
            actorModel: auditContext.actor.model,
            ip: auditContext.ip,
            ua: auditContext.ua
          }
        );
      }
      
    } else {
      // For Bank or Shabka payments
      ledgerEntry = await bankService.recordBankTransaction(
        {
          date: data.date || new Date(),
          type: entryType,
          method: data.paymentType,
          reference: reference,
          amount: entryAmount
        },
        {
          session,
          actor: auditContext.actor,
          ip: auditContext.ip,
          ua: auditContext.ua
        }
      );
      
      // Store reference to the ledger entry
      saved.ledgerEntryId = ledgerEntry._id;
      saved.ledgerEntryModel = 'BankTransaction';
      // Recalculate balances for all subsequent bank entries, except for Opening
      if (ledgerEntry.type !== 'Opening') {
        await bankService.recalculateBalancesFromDate(
          ledgerEntry.date,
          session,
          {
            actorId: auditContext.actor.id,
            actorModel: auditContext.actor.model,
            ip: auditContext.ip,
            ua: auditContext.ua
          }
        );
      }
    }
    
    // Update the expense with the ledger entry reference
    await Expense.findByIdAndUpdate(
      saved._id,
      { 
        ledgerEntryId: ledgerEntry._id,
        ledgerEntryModel: data.paymentType === 'Cash' ? 'CashRegister' : 'BankTransaction'
      },
      { 
        session,
        actor: auditContext.actor,
        ip: auditContext.ip,
        ua: auditContext.ua
      }
    );
    
    // Commit if we started the session
    if (ownSession) {
      await session.commitTransaction();
    }
    
    // Return the complete expense record with ledger references
    return {
      ...saved.toObject(),
      ledgerEntryId: ledgerEntry._id,
      ledgerEntryModel: data.paymentType === 'Cash' ? 'CashRegister' : 'BankTransaction'
    };
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
 * List expenses with optional filters, pagination, and text search.
 * @param {Object} opts
 * @param {string} [opts.category]        - Filter by expense category
 * @param {string} [opts.paymentType]     - Filter by payment method (Cash, Bank, Shabka)
 * @param {string} [opts.paidToModel]     - Filter by payee type (Employee, Vendor)
 * @param {string} [opts.paidTo]          - Filter by specific payee ID
 * @param {string} [opts.search]          - Text search across description field
 * @param {string} [opts.from]            - Start date (ISO string)
 * @param {string} [opts.to]              - End date (ISO string)
 * @param {number} [opts.page=1]          - Page number for pagination
 * @param {number} [opts.limit=10]        - Items per page
 * @param {string} [opts.sortBy='date']   - Field to sort by
 * @param {string} [opts.sortOrder='desc'] - Sort order (asc or desc)
 */
export async function getAllExpenses({
  category,
  paymentType,
  paidToModel,
  paidTo,
  search,
  from,
  to,
  page = 1,
  limit = 10,
  sortBy = 'date',
  sortOrder = 'desc'
} = {}, auditContext) {
  const query = { status: 'active' };
  
  // Apply filters if provided
  if (category)    query.category    = category;
  if (paymentType) query.paymentType = paymentType;
  if (paidToModel) query.paidToModel = paidToModel;
  if (paidTo)      query.paidTo      = mongoose.Types.ObjectId.isValid(paidTo) ? paidTo : null;
  
  // Date range filter
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to)   query.date.$lte = new Date(to);
  }
  
  // Text search - case insensitive
  if (search) {
    query.$or = [
      { description: { $regex: search, $options: 'i' } },
      // If the system has references to employees or vendors, we could expand this
      // to search their names as well through aggregation or lookups
    ];
  }

  // Determine sort direction
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  
  // Create sort object
  const sort = {};
  sort[sortBy] = sortDirection;
  
  // Always add secondary sort by date for consistency
  if (sortBy !== 'date') {
    sort.date = -1;
  }

  const skip = (page - 1) * limit;
  
  // Execute query with proper pagination
  const [ total, expenses ] = await Promise.all([
    Expense.countDocuments(query),
    Expense.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      // Populate references for more complete data
      .populate('paidTo', 'name') // Assuming both Employee and Vendor have name field
      .populate('linkedTo')
      .populate('ledgerEntryId')
      .setOptions({
        actor: auditContext.actor,
        ip: auditContext.ip,
        ua: auditContext.ua
      })
      .lean()
  ]);

  return {
    expenses,
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
 * Fetch one expense by ID.
 * @param {string} id
 */
export async function getExpenseById(id, auditContext) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid expense ID');
  }
  const exp = await Expense.findOne({ _id: id, status: 'active' })
    .populate('paidTo', 'name') // Assuming both Employee and Vendor have name field
    .populate('linkedTo')
    .populate('ledgerEntryId')
    .setOptions({
      actor: auditContext.actor,
      ip: auditContext.ip,
      ua: auditContext.ua
    })
    .lean();
  if (!exp) {
    throw new Error('Expense not found');
  }
  return exp;
}

/**
 * Update an expense.
 * @param {string} id
 * @param {Object} updateData – subset of 
 *    { date, category, description, amount, paymentType, paidTo, paidToModel, linkedTo, linkedToModel }
 */
export async function updateExpense(id, updateData, auditContext) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid expense ID');
  }

  if (!auditContext?.actor?.id || !auditContext?.actor?.model) {
    throw new Error('Missing or invalid audit actor');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const currentExpense = await Expense.findById(id).session(session);
    if (!currentExpense) {
      throw new Error('Expense not found');
    }

    // === Validations ===
    const validCategories = ['Rent', 'Utilities', 'Salaries', 'Commissions', 'Advances Recovered', 'Inventory', 'Miscellaneous'];
    const validPaymentTypes = ['Cash', 'Bank', 'Shabka'];

    if (updateData.category && !validCategories.includes(updateData.category)) {
      throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    if (updateData.paymentType && !validPaymentTypes.includes(updateData.paymentType)) {
      throw new Error(`Invalid payment type. Must be one of: ${validPaymentTypes.join(', ')}`);
    }

    const paymentType = updateData.paymentType || currentExpense.paymentType;


    if (updateData.amount !== undefined && updateData.amount === 0) {
      throw new Error('Amount cannot be zero.');
    }

    if (updateData.paidTo && !updateData.paidToModel && !currentExpense.paidToModel) {
      throw new Error('paidToModel is required when paidTo is provided');
    }

    if (updateData.linkedTo && !updateData.linkedToModel && !currentExpense.linkedToModel) {
      throw new Error('linkedToModel is required when linkedTo is provided');
    }

    // === Ledger Update Logic ===
    // Only update ledger if paymentType, date, or amount has changed
    const paymentTypeChanged = updateData.paymentType !== undefined && updateData.paymentType !== currentExpense.paymentType;
    const dateChanged = updateData.date !== undefined && new Date(updateData.date).getTime() !== new Date(currentExpense.date).getTime();
    const amountChanged = updateData.amount !== undefined && updateData.amount !== currentExpense.amount;

    const needsLedgerUpdate = paymentTypeChanged || dateChanged || amountChanged;

    if (needsLedgerUpdate && currentExpense.ledgerEntryId) {
      const amount = updateData.amount !== undefined ? updateData.amount : currentExpense.amount;
      let date;
      if (updateData.date) {
        // Preserve the time component when updating the date
        const currentDate = new Date(currentExpense.date);
        const newDate = new Date(updateData.date);
        newDate.setHours(currentDate.getHours());
        newDate.setMinutes(currentDate.getMinutes());
        newDate.setSeconds(currentDate.getSeconds());
        newDate.setMilliseconds(currentDate.getMilliseconds());
        date = newDate;
      } else {
        date = currentExpense.date;
      }
      const category = updateData.category || currentExpense.category;
      const description = updateData.description || currentExpense.description;
      const reference = `Expense: ${category} - ${description}`;
      const entryType = amount >= 0 ? 'Outflow' : 'Inflow';
      const entryAmount = Math.abs(amount);
      // Always delete the old ledger entry to ensure proper balance recalculation
      if (currentExpense.ledgerEntryModel === 'CashRegister') {
        await cashService.deleteCashEntry(
          currentExpense.ledgerEntryId,
          { ...auditContext, session }
        );
      } else if (currentExpense.ledgerEntryModel === 'BankTransaction') {
        await bankService.deleteBankTransaction(
          currentExpense.ledgerEntryId,
          { ...auditContext, session }
        );
      }
      // Create new ledger entry
      let newLedgerEntry;
      if (paymentTypeChanged ? updateData.paymentType === 'Cash' : currentExpense.paymentType === 'Cash') {
        newLedgerEntry = await cashService.recordCashEntry(
          { date, type: entryType, reference, amount: entryAmount },
          { ...auditContext, session }
        );
        currentExpense.ledgerEntryId = newLedgerEntry._id;
        currentExpense.ledgerEntryModel = 'CashRegister';
        await cashService.recalculateBalancesFromDate(
          date,
          session,
          {
            actorId: auditContext.actor.id,
            actorModel: auditContext.actor.model,
            ip: auditContext.ip,
            ua: auditContext.ua
          }
        );
      } else {
        newLedgerEntry = await bankService.recordBankTransaction(
          { date, type: entryType, method: paymentTypeChanged ? updateData.paymentType : currentExpense.paymentType, reference, amount: entryAmount },
          { ...auditContext, session }
        );
        currentExpense.ledgerEntryId = newLedgerEntry._id;
        currentExpense.ledgerEntryModel = 'BankTransaction';
        await bankService.recalculateBalancesFromDate(
          date,
          session,
          {
            actorId: auditContext.actor.id,
            actorModel: auditContext.actor.model,
            ip: auditContext.ip,
            ua: auditContext.ua
          }
        );
      }
    }

    // === Apply Updates ===
    for (const field of [
      'category', 'description', 'date', 'amount', 'paymentType',
      'paidTo', 'paidToModel', 'linkedTo', 'linkedToModel'
    ]) {
      if (updateData[field] !== undefined) {
        currentExpense[field] = updateData[field];
      }
    }

    // === Audit Info ===
    currentExpense.$locals = {
      audit: {
        actorId: auditContext.actor.id,
        actorModel: auditContext.actor.model,
        ip: auditContext.ip,
        ua: auditContext.ua
      }
    };

    const saved = await currentExpense.save({ session });
    await session.commitTransaction();

    return saved.toObject();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
/**
 * Delete an expense and its associated ledger entry.
 * @param {string} id
 */
export async function deleteExpense(id, auditContext) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid expense ID');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1) Load the expense so we know which ledger row to remove
    const expense = await Expense.findById(id).session(session);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // 2) If it has a linked ledger entry, remove & rebalance via your helpers
    if (expense.ledgerEntryId) {
      if (expense.ledgerEntryModel === 'CashRegister') {
        await cashService.deleteCashEntry(
          expense.ledgerEntryId,
          {
            session,
            actor: auditContext.actor,
            ip:    auditContext.ip,
            ua:    auditContext.ua
          }
        );
      } else if (expense.ledgerEntryModel === 'BankTransaction') {
        await bankService.deleteBankTransaction(
          expense.ledgerEntryId,
          {
            session,
            actor: auditContext.actor,
            ip:    auditContext.ip,
            ua:    auditContext.ua
          }
        );
      }
    }

    // 3) Soft delete the Expense itself
    expense.status = 'deleted';
    expense.$locals = expense.$locals || {};
    expense.$locals.audit = {
      actorId:    auditContext.actor.id,
      actorModel: auditContext.actor.model,
      ip:         auditContext.ip,
      ua:         auditContext.ua
    };
    await expense.save({ session });

    await session.commitTransaction();
    return expense.toObject();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
