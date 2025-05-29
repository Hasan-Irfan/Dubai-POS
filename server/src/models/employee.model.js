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

  salary:   { type: Number, required: true }
}, {
  timestamps: true
});

// Compound index for quick lookups
EmployeeSchema.index({ role: 1, status: 1 });

// ←—— Apply the audit plugin here
EmployeeSchema.plugin(auditPlugin);

// ←—— Guard against OverwriteModelError in hot‐reload or multiple imports
const Employee = mongoose.models.Employee
  || mongoose.model('Employee', EmployeeSchema);

export default Employee;
