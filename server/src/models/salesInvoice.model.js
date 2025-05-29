// src/models/SalesInvoice.js
import mongoose from 'mongoose';
import { auditPlugin } from './AuditPlugin.js';

const SalesInvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  date:         { type: Date, default: Date.now, index: true },
  customerName: String,
  salesmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },

  items: [{
    description: String,
    quantity:    Number,
    unitPrice:   Number,
    costPrice:   Number,
    vatAmount:   Number,
    lineTotal:   Number
  }],

  totals: {
    subTotal:    Number,
    totalVat:    Number,
    grandTotal:  Number,
    totalCost:   Number,
    totalProfit: Number
  },

  commission: {
    thresholdPct: Number,
    ratePct:      Number,
    eligible:     Boolean,
    amount:       Number,
    paid:         { type: Number, default: 0 },
    balanceDue:   { type: Number, default: 0 }
  },

  advance: {
    taken:     { type: Number, default: 0 },
    lastTaken: Date
  },

  payments: [{
    id:     { type: String, required: true },
    date:   Date,
    amount: Number,
    method: {
      type: String,
      enum: ['Cash','Bank','Shabka']
    },
    account: String
  }],

  status: {
    type: String,
    enum: ['Paid','Partially Paid','Unpaid','deleted'],
    default: 'Unpaid',
    index: true
  },
  
  deletedAt: { 
    type: Date,
    default: null 
  }
}, {
  timestamps: true
});

SalesInvoiceSchema.index({ salesmanId: 1, date: -1 });
SalesInvoiceSchema.index({ status: 1, date: -1 });

SalesInvoiceSchema.plugin(auditPlugin);

const SalesInvoice = mongoose.models.SalesInvoice || mongoose.model('SalesInvoice', SalesInvoiceSchema);

export default SalesInvoice;
