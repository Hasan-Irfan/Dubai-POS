// src/validators/user.validator.js
import Joi from 'joi';

const idParam = Joi.string().hex().length(24).required();

export const getAllUsersSchema = Joi.object({
  page:     Joi.number().integer().min(1).default(1),
  limit:    Joi.number().integer().min(1).default(10),
  role:     Joi.string().valid('superAdmin','admin','employee'),
  username: Joi.string()
});

export const getUserByIdSchema = Joi.object({
  id: idParam
});

export const updateUserSchema = Joi.object({
  username: Joi.string(),
  email:    Joi.string().email(),
  role:     Joi.string().valid('superAdmin','admin','employee')
});

export const deleteUserSchema = Joi.object({
  id: idParam
});
