import mongoose from 'mongoose';
import { auditPlugin } from './AuditPlugin.js';

const SalaryPaymentSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },

  date: { 
    type: Date, 
    default: Date.now, 
    required: true,
    index: true 
  },

  type: {
    type: String,
    enum: ['Basic Salary', 'Salary Payment', 'Advance Salary', 'Extra Commission', 'Recovery Award', 'Deduction'],
    required: true
  },

  amount: {
    type: Number,
    required: true,
    validate: {
      validator: function(value) {
        // Allow both positive and negative values but not zero
        return value !== 0;
      },
      message: 'Amount cannot be zero'
    }
  },

  description: {
    type: String,
    required: true
  },

  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank', 'Shabka'],
    required: function() {
      return ['Salary Payment', 'Advance Salary'].includes(this.type);
    }
  },

  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },

  // Reference to expense entry
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
SalaryPaymentSchema.index({ employeeId: 1, date: -1 });
SalaryPaymentSchema.index({ employeeId: 1, type: 1 });

// Apply the audit plugin
SalaryPaymentSchema.plugin(auditPlugin);

const SalaryPayment = mongoose.models.SalaryPayment
  || mongoose.model('SalaryPayment', SalaryPaymentSchema);

export default SalaryPayment; 