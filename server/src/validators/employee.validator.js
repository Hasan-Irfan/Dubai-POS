// src/validators/employee.validator.js
import Joi from 'joi';

const idParam = Joi.string().hex().length(24).required();

export const createEmployeeSchema = Joi.object({
  employeeData: Joi.object({
    name: Joi.string().required(),
    contact: Joi.object({
      email:   Joi.string().email().required(),
      phone:   Joi.string().required(),
      address: Joi.string().allow('')
    }).required(),
    role:     Joi.string().valid('salesman','regular').required(),
    hireDate: Joi.date().iso().required(),
    salary:   Joi.number().positive().required()
  }).required()
});

export const listEmployeesSchema = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).default(10),
  role:   Joi.string().valid('salesman','regular'),
  status: Joi.string().valid('active','inactive'),
  search: Joi.string().allow('')
});

export const getEmployeeByIdSchema = Joi.object({ id: idParam });

export const updateEmployeeSchema = Joi.object({
  name:             Joi.string(),
  'contact.email':  Joi.string().email(),
  'contact.phone':  Joi.string(),
  'contact.address':Joi.string().allow(''),
  role:             Joi.string().valid('salesman','regular'),
  hireDate:         Joi.date().iso(),
  salary:           Joi.number().positive()
});

export const deleteEmployeeSchema = Joi.object({
  hardDelete: Joi.boolean().default(false)
});
