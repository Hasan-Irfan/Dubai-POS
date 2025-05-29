import Joi from 'joi';

const idParam = Joi.string().hex().length(24).required();

export const createAdvanceSchema = Joi.object({
  invoiceId: idParam,
  salesmanId: idParam,
  amount: Joi.number().precision(2).positive().required(),
  note: Joi.string().max(200),
  paymentMethod: Joi.string().valid('Cash', 'Bank', 'Shabka').default('Cash'),
  account: Joi.when('paymentMethod', {
    is: Joi.valid('Bank', 'Shabka'),
    then: Joi.string().required(),
    otherwise: Joi.optional()
  })
});

export const listAdvancesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).default(10),
  salesmanId: Joi.string().hex().length(24),
  recovered: Joi.boolean(),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  search: Joi.string()
});

export const updateAdvanceSchema = Joi.object({
  note: Joi.string().max(200),
  recovered: Joi.boolean()
}); 