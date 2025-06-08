import { Router } from 'express';
import validate from '../middlewares/validate.js';
import { authorize } from '../middlewares/authorize.js';

import {
  createEmployeeSchema,
  listEmployeesSchema,
  getEmployeeByIdSchema,
  updateEmployeeSchema,
  deleteEmployeeSchema
} from '../validators/employee.validator.js';

import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee
} from '../controllers/employeeController.js';

const router = Router();
const guard = authorize('admin','superAdmin');

// POST & GET /api/v1/employees
router.route('/')
  .post(
    guard,
    validate(createEmployeeSchema, 'body'),
    createEmployee
  )
  .get(
    guard,
    validate(listEmployeesSchema, 'query'),
    getAllEmployees
  );

// GET, PUT, DELETE /api/v1/employees/:id
router.route('/:id')
  .get(
    guard,
    validate(getEmployeeByIdSchema, 'params'),
    getEmployeeById
  )
  .put(
    guard,
    validate(getEmployeeByIdSchema, 'params'),
    validate(updateEmployeeSchema,  'body'),
    updateEmployee
  )
  .delete(
    guard,
    validate(getEmployeeByIdSchema, 'params'),
    validate(deleteEmployeeSchema,  'query'),
    deleteEmployee
  );

export default router;

