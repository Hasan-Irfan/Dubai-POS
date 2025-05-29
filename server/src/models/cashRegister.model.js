import mongoose from 'mongoose';
import { auditPlugin } from './AuditPlugin.js';

const CashRegisterSchema = new mongoose.Schema({
  date:      { type: Date, default: Date.now, index: true },
  type:      { type: String, enum: ['Opening','Inflow','Outflow'], required: true },
  reference: String,
  amount:    { type: Number, required: true },
  balance:   Number,
  status:    { type: String, enum: ['active', 'deleted'], default: 'active', index: true }
}, {
  timestamps: true
});

CashRegisterSchema.plugin(auditPlugin);

const CashRegister = mongoose.models.CashRegister || mongoose.model('CashRegister', CashRegisterSchema);

export default CashRegister;
