import mongoose from 'mongoose';
import { auditPlugin } from './AuditPlugin.js';

const ExpenseSchema = new mongoose.Schema({
  date:        { type: Date, default: Date.now, index: true },
  category:    {
    type: String,
    enum: ['Rent','Utilities','Salaries','Commissions','Advances Recovered','Inventory','Miscellaneous'],
    required: true,
    index: true
  },
  description: { type: String, required: true },
  amount:      { 
    type: Number, 
    required: true,
    validate: {
      validator: function(value) {
        // Value can be any number except zero
        return value !== 0;
      },
      message: 'Amount cannot be zero. Use positive for expenses or negative for reversals.'
    }
  },
  paymentType: { 
    type: String, 
    enum: ['Cash','Bank','Shabka'],
    required: true 
  },

  // dynamic reference: Employee vs Vendor
  paidTo: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'paidToModel'
  },
  paidToModel: {
    type: String,
    enum: ['Employee','Vendor']
  },

  // e.g. link back to invoice or advance
  linkedTo: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'linkedToModel'
  },
  linkedToModel: {
    type: String,
    enum: ['SalesInvoice','SalesmanAdvance']
  },
  
  // Bidirectional reference to the ledger entry
  ledgerEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'ledgerEntryModel'
  },
  ledgerEntryModel: {
    type: String,
    enum: ['CashRegister','BankTransaction']
  },
  status: {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

// Add indexes for common query patterns
ExpenseSchema.index({ category: 1, date: -1 });
ExpenseSchema.index({ paidTo: 1, paidToModel: 1 });
ExpenseSchema.index({ ledgerEntryId: 1, ledgerEntryModel: 1 });
ExpenseSchema.index({ paymentType: 1 });


ExpenseSchema.plugin(auditPlugin);

const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);

export default Expense;
