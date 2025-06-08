// src/models/BankTransaction.js
import mongoose from 'mongoose';
import { auditPlugin } from './AuditPlugin.js';

const BankTransactionSchema = new mongoose.Schema({
  date:      { type: Date, default: Date.now, index: true },
  type:      { type: String, enum: ['Opening','Inflow','Outflow'], required: true },
  method:    { type: String, enum: ['Bank','Shabka'], required: true },
  reference: String,
  amount:    { type: Number, required: true },
  balance:   Number,
  status:    {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});


BankTransactionSchema.plugin(auditPlugin);

const BankTransaction = mongoose.models.BankTransaction || mongoose.model('BankTransaction', BankTransactionSchema);

export default BankTransaction;
