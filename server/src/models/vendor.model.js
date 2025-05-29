import mongoose from 'mongoose';
import { auditPlugin } from './AuditPlugin.js';

const VendorSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  contact: {
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^[0-9+\-\s()]{6,20}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number`
      }
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: props => `${props.value} is not a valid email address`
      }
    },
    address: {
      type: String,
      trim: true
    }
  },
  openingBalance: { 
    type: Number, 
    default: 0,
    min: 0
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
VendorSchema.index({ name: 1, status: 1 }, { name: 'idx_name_status' });
VendorSchema.index({ 'contact.email': 1, status: 1 }, { name: 'idx_email_status' });

VendorSchema.plugin(auditPlugin);

const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);

export default Vendor;
