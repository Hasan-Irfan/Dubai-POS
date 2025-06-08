import mongoose from 'mongoose';
import { auditPlugin } from './AuditPlugin.js';

const VendorTransactionSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['Purchase', 'Payment'],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 500
  },
  amount: {
    type: Number,
    required: true,
    validate: {
      validator: function(v) {
        // Allow negative amounts for reversals
        if (this.description && this.description.startsWith('Reversal of:')) {
          return v < 0; // Reversals must be negative
        }
        return v > 0; // Normal transactions must be positive
      },
      message: props => {
        const isReversal = this.description && this.description.startsWith('Reversal of:');
        if (isReversal) {
          return `${props.value} must be negative for reversal transactions`;
        }
        return `${props.value} must be positive for normal transactions`;
      }
    }
  },
  balance: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Associated ledger entry (cash or bank) for this transaction
  ledgerEntryId: {
    type: mongoose.Schema.Types.ObjectId
  },
  ledgerEntryModel: {
    type: String,
    enum: ['CashRegister','BankTransaction']
  },
  method: {
    type: String,
    enum: ['Cash', 'Bank', 'Shabka'],
    required: function() {
      return this.type === 'Payment'; // Only required for Payment transactions
    }
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

// Compound indexes for common queries
VendorTransactionSchema.index(
  { vendorId: 1, date: -1 },
  { name: 'idx_vendor_date' }
);
VendorTransactionSchema.index(
  { vendorId: 1, status: 1 },
  { name: 'idx_vendor_status' }
);

VendorTransactionSchema.plugin(auditPlugin);

const VendorTransaction = mongoose.models.VendorTransaction || mongoose.model('VendorTransaction', VendorTransactionSchema);

export default VendorTransaction;
