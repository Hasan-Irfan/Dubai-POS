// src/models/Employee.js
import mongoose from 'mongoose';
import { auditPlugin } from './AuditPlugin.js';

const EmployeeSchema = new mongoose.Schema({
  name:    { type: String,  required: true },
  contact: {
    phone:   String,
    email:   { type: String, required: true, unique: true },
    address: String
  },

  // Business‐domain role
  role: {
    type: String,
    enum: ['salesman','regular'],
    required: true,
    index: true
  },

  hireDate: { type: Date, default: Date.now },
  status:   {
    type: String,
    enum: ['active','inactive'],
    default: 'active',
    index: true
  },

  // Base salary configuration
  salary: {
    gross: { type: Number, required: true },
    net: { type: Number },
    lastModified: { type: Date, default: Date.now }
  },

  // Running balances
  salaryBalance: {
    type: Number,
    default: 0,
    required: true
  }
}, {
  timestamps: true
});

// Compound index for quick lookups
EmployeeSchema.index({ role: 1, status: 1 });

// Pre-save middleware to set net salary equal to gross by default
EmployeeSchema.pre('save', function(next) {
  // Set net salary equal to gross for new employees or when gross is updated
  if (this.isNew || this.isModified('salary.gross')) {
    if (!this.salary.net) {
      this.salary.net = this.salary.gross;
    }
    this.salary.lastModified = new Date();
  }
  next();
});

// ←—— Apply the audit plugin here
EmployeeSchema.plugin(auditPlugin);

// ←—— Guard against OverwriteModelError in hot‐reload or multiple imports
const Employee = mongoose.models.Employee
  || mongoose.model('Employee', EmployeeSchema);

export default Employee;
