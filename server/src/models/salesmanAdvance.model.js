// src/models/SalesmanAdvance.js
import mongoose from 'mongoose';
import { auditPlugin } from './AuditPlugin.js';

const SalesmanAdvanceSchema = new mongoose.Schema({
  salesmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesInvoice',
    required: true
  },
  date:      { type: Date, default: Date.now, index: true },
  amount:    { type: Number, required: true },
  note:      String,
  recovered: { type: Boolean, default: false },
  status:    {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank', 'Shabka'],
    default: 'Cash'
  },
  account: {
    type: String,
    // Required only if paymentMethod is not Cash
    required: function() {
      return this.paymentMethod !== 'Cash';
    }
  }
}, {
  timestamps: true
});

// Add compound index for salesman and status
SalesmanAdvanceSchema.index({ salesmanId: 1, status: 1 });

SalesmanAdvanceSchema.plugin(auditPlugin);

const SalesmanAdvance = mongoose.models.SalesmanAdvance || mongoose.model('SalesmanAdvance', SalesmanAdvanceSchema);

export default SalesmanAdvance;
