import Joi from 'joi';

const idParam = Joi.string().hex().length(24).required();

export const addSalaryPaymentSchema = Joi.object({
  employeeId: idParam,
  type: Joi.string().valid(
    'Basic Salary',
    'Salary Payment',
    'Advance Salary',
    'Extra Commission',
    'Recovery Award',
    'Deduction'
  ).required(),
  amount: Joi.number().not(0).required(),
  description: Joi.string().required(),
  paymentMethod: Joi.string().valid('Cash', 'Bank', 'Shabka').when('type', {
    is: Joi.string().valid('Salary Payment', 'Advance Salary'),
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  date: Joi.date().iso()
});

export const getSalaryHistorySchema = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  type: Joi.string().valid(
    'Basic Salary',
    'Salary Payment',
    'Advance Salary',
    'Extra Commission',
    'Recovery Award',
    'Deduction'
  )
});

export const updateSalarySchema = Joi.object({
  gross: Joi.number().positive().required(),
  net: Joi.number().positive().required()
}); 