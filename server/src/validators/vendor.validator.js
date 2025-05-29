import Joi from 'joi';

const idParam = Joi.string().hex().length(24).required();

// Schema for creating vendor
export const createVendorSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  contact: Joi.object({
    phone: Joi.string().pattern(/^[0-9+\-\s()]{6,20}$/),
    email: Joi.string().email(),
    address: Joi.string().max(200)
  }),
  openingBalance: Joi.number().min(0).default(0)
});

// Schema for updating vendor
export const updateVendorSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  contact: Joi.object({
    phone: Joi.string().pattern(/^[0-9+\-\s()]{6,20}$/),
    email: Joi.string().email(),
    address: Joi.string().max(200)
  }),
  openingBalance: Joi.number().min(0)
});

// Schema for creating vendor transaction
export const createVendorTransactionSchema = Joi.object({
  vendorId: idParam,
  type: Joi.string().valid('Purchase', 'Payment').required(),
  description: Joi.string().min(3).max(500).required(),
  amount: Joi.number().precision(2).positive().required(),
  method: Joi.string().valid('Cash', 'Bank', 'Shabka')
});

// Schema for updating vendor transaction - only allows description to be updated
export const updateVendorTransactionSchema = Joi.object({
  description: Joi.string().min(3).max(500).required()
});

// Schema for vendor transaction listing
export const listVendorTransactionsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  vendorId: Joi.string().hex().length(24),
  from: Joi.date().iso(),
  to: Joi.date().iso()
}); 