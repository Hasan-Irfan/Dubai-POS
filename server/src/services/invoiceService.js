// src/services/invoiceService.js
import mongoose from 'mongoose';
import SalesInvoice from '../models/salesInvoice.model.js';
import * as cashService from './cashService.js';
import * as bankService from './bankService.js';
import * as expenseService from './expenseService.js';
import CashRegister from '../models/cashRegister.model.js';
import BankTransaction from '../models/bankTransaction.model.js';

/**
 * Validates invoice data for creation and updates
 * @param {Object} data - Invoice data to validate
 * @throws {Error} If validation fails
 */
function validateInvoiceData(data) {
  // Check for required fields during creation
  if (!data.invoiceNumber) {
    throw new Error('Invoice number is required');
  }
  
  if (!data.salesmanId) {
    throw new Error('Salesman ID is required');
  }
  
  // Validate items
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('Invoice must contain at least one item');
  }
  
  // Validate each item
  data.items.forEach((item, index) => {
    if (!item.description) {
      throw new Error(`Item at index ${index} is missing a description`);
    }
    
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      throw new Error(`Item at index ${index} has an invalid quantity`);
    }
    
    if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
      throw new Error(`Item at index ${index} has an invalid unit price`);
    }
    
    if (typeof item.costPrice !== 'number' || item.costPrice < 0) {
      throw new Error(`Item at index ${index} has an invalid cost price`);
    }
    
    if (item.vatAmount && (typeof item.vatAmount !== 'number' || item.vatAmount < 0)) {
      throw new Error(`Item at index ${index} has an invalid VAT amount`);
    }
  });
  
  // Validate payment data if provided
  if (data.payments && Array.isArray(data.payments)) {
    const validMethods = ['Cash', 'Bank', 'Shabka'];
    
    data.payments.forEach((payment, index) => {
      if (typeof payment.amount !== 'number' || payment.amount <= 0) {
        throw new Error(`Payment at index ${index} has an invalid amount`);
      }
      
      if (!validMethods.includes(payment.method)) {
        throw new Error(`Payment at index ${index} has an invalid method. Must be one of: ${validMethods.join(', ')}`);
      }
      

    });
  }
  
  // Validate status if provided
  if (data.status) {
    const validStatuses = ['Paid', 'Partially Paid', 'Unpaid', 'deleted'];
    if (!validStatuses.includes(data.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
  }
}

/**
 * Validates status transitions
 * @param {string} currentStatus - Current invoice status
 * @param {string} newStatus - Proposed new status
 * @throws {Error} If transition is invalid
 */
function validateStatusTransition(currentStatus, newStatus) {
  const validTransitions = {
    'Unpaid': ['Partially Paid', 'Paid', 'deleted'],
    'Partially Paid': ['Paid', 'Unpaid', 'deleted'],
    'Paid': ['Partially Paid', 'Unpaid', 'deleted'],
    'deleted': []
  };
  
  if (!validTransitions[currentStatus].includes(newStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
  }
}

/**
 * Check if opening balances exist for cash and bank transactions
 * @throws {Error} If no opening balances exist
 */
async function validateOpeningBalances(session) {
  // Check for cash opening balance
  const cashOpening = await CashRegister.findOne({ 
    type: 'Opening',
    status: 'active'
  }).session(session);

  // Check for bank opening balance
  const bankOpening = await BankTransaction.findOne({ 
    type: 'Opening',
    status: 'active'
  }).session(session);

  if (!cashOpening && !bankOpening) {
    throw new Error('No opening balances found. Please create opening balances for cash and/or bank accounts before creating invoices.');
  }
}

/**
 * Create a new sales invoice, computing totals and profit.
 * @param {Object} data – {
 *   invoiceNumber,
 *   date,
 *   customerName,
 *   salesmanId,
 *   items: [{ description, quantity, unitPrice, costPrice, vatAmount }],
 *   payments?: [{ date?, method, amount }],
 *   status?         // defaults to "Unpaid"
 * }
 */
export async function createInvoice(data, auditContext) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate invoice data
    validateInvoiceData(data);
    
    // Check for opening balances
    await validateOpeningBalances(session);
    
    // Check for duplicate invoice number
    const existingInvoice = await SalesInvoice.findOne({ 
      invoiceNumber: data.invoiceNumber,
      status: { $ne: 'deleted' }
    });
    
    if (existingInvoice) {
      throw new Error(`Invoice number ${data.invoiceNumber} already exists`);
    }

    // 1) Compute item lineTotals
    const items = data.items.map(item => ({
      ...item,
      lineTotal: item.unitPrice * item.quantity + (item.vatAmount || 0)
    }));

    // 2) Compute totals
    const subTotal   = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const totalVat   = items.reduce((sum, i) => sum + (i.vatAmount || 0), 0);
    const grandTotal = subTotal + totalVat;
    const totalCost  = items.reduce((sum, i) => sum + i.costPrice * i.quantity, 0);
    const totalProfit= subTotal - totalCost;

    // Validate calculated totals
    if (grandTotal <= 0) {
      throw new Error('Invoice total amount must be greater than zero');
    }

    // 3) Build invoice
    const inv = new SalesInvoice({
      invoiceNumber: data.invoiceNumber,
      date:          data.date || new Date(),
      customerName:  data.customerName,
      salesmanId:    data.salesmanId,
      items,
      totals: {
        subTotal, totalVat, grandTotal, totalCost, totalProfit
      },
      payments: [],
      status:   data.status || 'Unpaid'
    });

    // 4) Set audit metadata
    inv.$locals = inv.$locals || {};
    inv.$locals.audit = {
      actorId:    auditContext.actor.id,
      actorModel: auditContext.actor.model,
      ip:         auditContext.ip,
      ua:         auditContext.ua
    };

    // 5) Save invoice
    const saved = await inv.save({ session });

    // 6) Handle any initial payments
    if (data.payments && data.payments.length > 0) {
      let paidAmt = 0;
      
      for (const pay of data.payments) {
        // Validate payment amount
        if (typeof pay.amount !== 'number' || pay.amount <= 0) {
          throw new Error('Payment amount must be positive');
        }
        
        // Validate total payments don't exceed invoice total
        if (paidAmt + pay.amount > grandTotal) {
          throw new Error(`Total payments (${paidAmt + pay.amount}) exceed invoice total (${grandTotal})`);
        }
        
        const paymentDate = pay.date || new Date();
        const reference = `Payment for Invoice ${inv.invoiceNumber}`;
        
        // Record payment in invoice with unique ID
        saved.payments.push({
          id: new mongoose.Types.ObjectId().toString(),
          date: paymentDate,
          amount: pay.amount,
          method: pay.method,
          status: 'completed'
        });
        
        // Record in appropriate ledger
        if (pay.method === 'Cash') {
          await cashService.recordCashEntry(
            {
              date: paymentDate,
              type: 'Inflow',
              reference,
              amount: pay.amount
            },
            {
              session,
              actor: auditContext.actor,
              ip: auditContext.ip,
              ua: auditContext.ua
            }
          );
        } else {
          await bankService.recordBankTransaction(
            {
              date: paymentDate,
              type: 'Inflow',
              method: pay.method,
              reference,
              amount: pay.amount
            },
            {
              session,
              actor: auditContext.actor,
              ip: auditContext.ip,
              ua: auditContext.ua
            }
          );
        }
        
        paidAmt += pay.amount;
      }
      
      // Update status based on payment amount
      if (paidAmt >= grandTotal) {
        saved.status = 'Paid';
      } else if (paidAmt > 0) {
        saved.status = 'Partially Paid';
      }
      
      await saved.save({ session });
    }

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
 * List invoices with optional filters, pagination, and date range.
 * @param {Object} opts – { filters:{ status, salesmanId }, from, to, page=1, limit=10, includeDeleted=false }
 */
export async function getAllInvoices({
  filters = {},
  from,
  to,
  page = 1,
  limit = 10,
  includeDeleted = false,
  sort = '-createdAt'
} = {}) {
  const query = {};
  
  // Apply filters
  if (filters.status) {
    query.status = filters.status;
  } else if (!includeDeleted) {
    // By default, exclude deleted invoices
    query.status = { $ne: 'deleted' };
  }
  
  if (filters.salesmanId) {
    if (!mongoose.Types.ObjectId.isValid(filters.salesmanId)) {
      throw new Error('Invalid salesman ID');
    }
    query.salesmanId = filters.salesmanId;
  }

  // Add customer name filter with case-insensitive regex
  if (filters.customerName) {
    query.customerName = { $regex: filters.customerName, $options: 'i' };
  }
  
  // Apply date range
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }

  // Parse sort parameter into MongoDB format
  let sortCriteria = {};
  if (sort) {
    // Handle multiple sort fields, e.g. '-date,customerName'
    const sortFields = sort.split(',');
    sortFields.forEach(field => {
      const direction = field.startsWith('-') ? -1 : 1;
      const fieldName = field.startsWith('-') ? field.substring(1) : field;
      sortCriteria[fieldName] = direction;
    });
  }
  
  const skip = (page - 1) * limit;
  const [ total, invoices ] = await Promise.all([
    SalesInvoice.countDocuments(query),
    SalesInvoice.find(query)
      .populate('salesmanId', 'name contact')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return {
    invoices,
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
 * Fetch a single invoice by ID.
 */
export async function getInvoiceById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid invoice ID');
  }
  const inv = await SalesInvoice.findById(id)
    .populate('salesmanId', 'name contact')
    .lean();
  if (!inv) {
    throw new Error('Invoice not found');
  }
  return inv;
}

/**
 * Update an invoice's mutable fields.
 * @param {string} id
 * @param {Object} data – {
 *   items?: [{ description, quantity, unitPrice, costPrice, vatAmount }],
 *   status?: string,
 *   customerName?: string,
 *   date?: Date
 * }
 */
export async function updateInvoice(id, data, auditContext) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid invoice ID');
  }

  // Validate update data for items
  if (data.items && (!Array.isArray(data.items) || data.items.length === 0)) {
    throw new Error('Invoice must contain at least one item');
  }
  
  if (data.items) {
    // Validate each item
    data.items.forEach((item, index) => {
      if (!item.description) {
        throw new Error(`Item at index ${index} is missing a description`);
      }
      
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw new Error(`Item at index ${index} has an invalid quantity`);
      }
      
      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
        throw new Error(`Item at index ${index} has an invalid unit price`);
      }
      
      if (typeof item.costPrice !== 'number' || item.costPrice < 0) {
        throw new Error(`Item at index ${index} has an invalid cost price`);
      }
      
      if (item.vatAmount && (typeof item.vatAmount !== 'number' || item.vatAmount < 0)) {
        throw new Error(`Item at index ${index} has an invalid VAT amount`);
      }
    });
  }

  // Enforce immutable payment history
  if (data.payments) {
    throw new Error('Direct payment editing is not allowed. Use addPayment endpoint instead.');
  }

  try {
    // STEP 1: First fetch and validate invoice without a session
    const invoiceCheck = await SalesInvoice.findById(id);
    
    if (!invoiceCheck) {
      throw new Error('Invoice not found');
    }
    
    if (invoiceCheck.status === 'deleted') {
      throw new Error('Cannot update a deleted invoice');
    }
    
    const hasPaidStatus = invoiceCheck.status === 'Paid' || invoiceCheck.status === 'Partially Paid';
    
    if (hasPaidStatus) {
      throw new Error('This invoice cannot be updated because it has payments recorded. Please delete this invoice and create a new one instead.');
    }
    
    // Enforce status integrity
    if (data.status) {
      throw new Error('Status cannot be updated directly; it is derived from payments.');
    }
    
    // STEP 2: Now get a fresh copy of the document to modify
    const current = await SalesInvoice.findById(id);
    
    // Basic fields
    if (data.customerName) current.customerName = data.customerName;
    if (data.date) current.date = data.date;
    
    // Complex item update with recalculation requires more work
    if (data.items) {
      // Compute all the derived values
      const items = data.items.map(item => ({
        ...item,
        lineTotal: item.unitPrice * item.quantity + (item.vatAmount || 0)
      }));
      
      const subTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const totalVat = items.reduce((sum, i) => sum + (i.vatAmount || 0), 0);
      const grandTotal = subTotal + totalVat;
      const totalCost = items.reduce((sum, i) => sum + i.costPrice * i.quantity, 0);
      const totalProfit = subTotal - totalCost;
      
      // Validate calculated totals
      if (grandTotal <= 0) {
        throw new Error('Invoice total amount must be greater than zero');
      }
      
      // Get current paid amount
      const currentPaidAmt = current.payments.reduce((sum, p) => sum + p.amount, 0);
      
      // Ensure new total isn't less than what's already been paid
      if (grandTotal < currentPaidAmt) {
        throw new Error(`New invoice total (${grandTotal}) is less than the amount already paid (${currentPaidAmt})`);
      }
      
      // Set all the calculated fields
      current.items = items;
      current.totals = {
        subTotal,
        totalVat,
        grandTotal,
        totalCost,
        totalProfit
      };

       // Update status based on payment
       if (currentPaidAmt >= grandTotal) {
        current.status = 'Paid';
      } else if (currentPaidAmt > 0) {
        current.status = 'Partially Paid';
      } else {
        current.status = 'Unpaid';
      }
    }
    
    // Set audit context
    current.$locals = {
      audit: {
        actorId: auditContext.actor.id,
        actorModel: auditContext.actor.model,
        ip: auditContext.ip,
        ua: auditContext.ua
      }
    };
    
    await current.save();
    
    return current.toObject();
  } catch (error) {
    // Improve error messages for common scenarios
    if (error.name === 'ValidationError') {
      throw new Error(`Validation error: ${error.message}`);
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      throw new Error('Duplicate key error. This invoice may conflict with an existing one.');
    } else {
      // Log the error for debugging but throw a clean version to the client
      console.error('Error updating invoice:', error);
      throw error;
    }
  }
}

/**
 * Delete an invoice and handle all cascading effects:
 * 1. Reverse any payments (cash or bank)
 * 2. Soft-delete the invoice record
 */
export async function deleteInvoice(id, auditContext) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid invoice ID');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Get the invoice with all details
    const invoice = await SalesInvoice.findById(id)
      .session(session)
      .setOptions({
        actor: auditContext.actor,
        ip: auditContext.ip,
        ua: auditContext.ua
      });

    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    // Check if invoice is already deleted
    if (invoice.status === 'deleted') {
      throw new Error('Invoice is already deleted');
    }

    // Store invoice details for reference and return value
    const invoiceData = invoice.toObject();

    // 2. Reverse all payments recorded for this invoice
    for (const payment of invoice.payments) {
      const reversalDate = new Date();
      const reversalReference = `Reversal of payment for deleted invoice ${invoice.invoiceNumber}`;
      
      if (payment.method === 'Cash') {
        // Create a reversal cash entry with correct audit metadata
        await cashService.recordCashEntry(
          {
            date: reversalDate,
            type: 'Outflow',
            reference: reversalReference,
            amount: payment.amount
          },
          { 
            session,
            actor: auditContext.actor,
            ip: auditContext.ip,
            ua: auditContext.ua
          }
        );
      } else {
        // Create a reversal bank entry with correct audit metadata
        await bankService.recordBankTransaction(
          {
            date: reversalDate,
            type: 'Outflow',
            method: payment.method,
            reference: reversalReference,
            amount: payment.amount
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
    
    // Clear all payments since they've been reversed
    invoice.payments = [];

    // 3. Soft-delete the invoice
    invoice.status = 'deleted';
    invoice.deletedAt = new Date();
    
    // Set audit context
    invoice.$locals = {
      audit: {
        actorId: auditContext.actor.id,
        actorModel: auditContext.actor.model,
        ip: auditContext.ip,
        ua: auditContext.ua
      }
    };
    
    await invoice.save({ session });
    await session.commitTransaction();
    
    // Add deletion info to the returned data
    invoiceData.status = 'deleted';
    invoiceData.deletedAt = new Date();
    
    return invoiceData;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// Add a payment, update invoice status, and record cash/bank ledger entry
export async function addPayment(
  invoiceId,
  { amount, method, account, date },
  auditContext
) {
  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    throw new Error('Invalid invoice ID');
  }
  
  // Validate amount is positive
  if (!amount || amount <= 0) {
    throw new Error('Payment amount must be positive');
  }
  
  // Validate payment method
  const validMethods = ['Cash', 'Bank', 'Shabka'];
  if (!validMethods.includes(method)) {
    throw new Error(`Invalid payment method. Must be one of: ${validMethods.join(', ')}`);
  }
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find invoice and lock it for update
    const inv = await SalesInvoice.findById(invoiceId)
      .session(session)
      .setOptions({ 
        actor: auditContext.actor, 
        ip: auditContext.ip, 
        ua: auditContext.ua 
      });
      
    if (!inv) throw new Error('Invoice not found');
    
    // Check if invoice is deleted
    if (inv.status === 'deleted') {
      throw new Error('Cannot add payment to a deleted invoice');
    }

    // Calculate the current amount already paid
    const currentPaidAmt = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    const grandTotal = inv.totals.grandTotal;
    const remainingAmount = grandTotal - currentPaidAmt;

    // Fix floating point precision for comparison
    const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
    if (round2(amount) > round2(remainingAmount)) {
      throw new Error(`Payment amount (${round2(amount)}) exceeds the remaining balance (${round2(remainingAmount)})`);
    }

    // Standardize date handling
    const paymentDate = date ? new Date(date) : new Date();
    
    // Generate a unique ID for the payment
    const paymentId = new mongoose.Types.ObjectId().toString();
    
    // Append payment
    inv.payments.push({
      id: paymentId,
      date: paymentDate,
      amount,
      method
    });

    // Recalculate status
    const paidAmt = currentPaidAmt + amount;
    if (paidAmt >= grandTotal) {
      // Check if status transition is valid
      validateStatusTransition(inv.status, 'Paid');
      inv.status = 'Paid';
    } else if (paidAmt > 0) {
      // Check if status transition is valid
      validateStatusTransition(inv.status, 'Partially Paid');
      inv.status = 'Partially Paid';
    }

    // Set audit metadata
    inv.$locals = {
      audit: {
        actorId: auditContext.actor.id,
        actorModel: auditContext.actor.model,
        ip: auditContext.ip,
        ua: auditContext.ua
      }
    };
    
    // Save invoice changes
    await inv.save({ session });

    // Record ledger entry within the same transaction
    const reference = `Payment for Invoice ${inv.invoiceNumber}`;
    
    if (method === 'Cash') {
      await cashService.recordCashEntry(
        { 
          date: paymentDate, 
          type: 'Inflow', 
          reference, 
          amount 
        },
        {
          session,
          actor: auditContext.actor,
          ip: auditContext.ip,
          ua: auditContext.ua
        }
      );
    } else {
      await bankService.recordBankTransaction(
        { 
          date: paymentDate, 
          type: 'Inflow', 
          method, 
          reference, 
          amount 
        },
        {
          session,
          actor: auditContext.actor,
          ip: auditContext.ip,
          ua: auditContext.ua
        }
      );
    }
    
    // Commit the transaction only after all operations succeed
    await session.commitTransaction();
    
    // Return a fresh copy of the invoice with all updates applied
    const updatedInvoice = await SalesInvoice.findById(invoiceId)
      .populate('salesmanId', 'name contact')
      .lean();
      
    return updatedInvoice;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * Reverse a specific payment on an invoice and update all related records
 * @param {string} invoiceId - The ID of the invoice
 * @param {string} paymentId - The ID of the payment to reverse
 * @param {string} reason - The reason for the reversal
 * @param {Object} auditContext - The audit context
 * @returns {Object} The updated invoice
 */
export async function reversePayment(
  invoiceId,
  paymentId,
  reason,
  auditContext
) {
  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    throw new Error('Invalid invoice ID');
  }
  
  if (!paymentId) {
    throw new Error('Payment ID is required');
  }
  
  if (!reason) {
    throw new Error('Reason for reversal is required');
  }
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find invoice and lock it for update
    const inv = await SalesInvoice.findById(invoiceId)
      .session(session)
      .setOptions({ 
        actor: auditContext.actor, 
        ip: auditContext.ip, 
        ua: auditContext.ua 
      });
      
    if (!inv) throw new Error('Invoice not found');
    
    // Check if invoice is deleted
    if (inv.status === 'deleted') {
      throw new Error('Cannot reverse payment on a deleted invoice');
    }
    
    // Find the payment to reverse
    const paymentIndex = inv.payments.findIndex(p => p.id === paymentId);
    if (paymentIndex === -1) {
      throw new Error('Payment not found');
    }
    
    const payment = inv.payments[paymentIndex];
    
    // Remove the payment from the array
    inv.payments.splice(paymentIndex, 1);
    
    // Recalculate total paid amount
    const currentPaidAmt = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Update invoice status based on new payment total
    const grandTotal = inv.totals.grandTotal;
    if (currentPaidAmt >= grandTotal) {
      inv.status = 'Paid';
    } else if (currentPaidAmt > 0) {
      inv.status = 'Partially Paid';
    } else {
      inv.status = 'Unpaid';
    }
    
    // Set audit metadata
    inv.$locals = {
      audit: {
        actorId: auditContext.actor.id,
        actorModel: auditContext.actor.model,
        ip: auditContext.ip,
        ua: auditContext.ua
      }
    };
    
    // Save invoice changes
    await inv.save({ 
      session, 
      actor: auditContext.actor, 
      ip: auditContext.ip, 
      ua: auditContext.ua 
    });
    
    // Create a reversal entry in the appropriate ledger
    const reversalReference = `Reversal of payment for Invoice ${inv.invoiceNumber}: ${reason}`;
    
    if (payment.method === 'Cash') {
      await cashService.recordCashEntry(
        { 
          date: new Date(), 
          type: 'Outflow', 
          reference: reversalReference, 
          amount: payment.amount 
        },
        {
          session,
          actor: auditContext.actor,
          ip: auditContext.ip,
          ua: auditContext.ua
        }
      );
    } else {
      await bankService.recordBankTransaction(
        { 
          date: new Date(), 
          type: 'Outflow', 
          method: payment.method, 
          reference: reversalReference, 
          amount: payment.amount 
        },
        {
          session,
          actor: auditContext.actor,
          ip: auditContext.ip,
          ua: auditContext.ua
        }
      );
    }
    
    // Commit transaction
    await session.commitTransaction();
    
    // Return updated invoice
    const updatedInvoice = await SalesInvoice.findById(invoiceId)
      .populate('salesmanId', 'name contact')
      .lean();
      
    return updatedInvoice;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
