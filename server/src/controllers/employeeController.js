// src/controllers/employeeController.js
import { asyncHandler } from '../utils/asyncHandler.js';
import * as employeeService from '../services/employeeService.js';

/**
 * POST /api/v1/employees
 * Body: { employeeData }
 */
export const createEmployee = asyncHandler(async (req, res) => {
  const { employeeData } = req.body;
  const employee = await employeeService.addEmployee(employeeData, req.audit);
  res.status(201).json({ success: true, employee });
});

/**
 * GET /api/v1/employees
 * Query: page, limit, role, status, search
 */
export const getAllEmployees = asyncHandler(async (req, res) => {
  const {
    page   = 1,
    limit  = 10,
    role,
    search = ''
  } = req.query;

  const result = await employeeService.getAllEmployees({
    filters: { role },
    search,
    page:  Number(page),
    limit: Number(limit)
  }, req.audit);

  res.status(200).json({ success: true, ...result });
});

/**
 * GET /api/v1/employees/:id
 */
export const getEmployeeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employee = await employeeService.getEmployeeById(id);
  res.status(200).json({ success: true, employee });
});

/**
 * PUT /api/v1/employees/:id
 * Body: any of { name, contact, role, hireDate, salary }
 */
export const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const employee = await employeeService.updateEmployee(id, updateData, req.audit);
  res.status(200).json({ success: true, employee });
});

/**
 * DELETE /api/v1/employees/:id?hardDelete=true
 */
export const deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employee = await employeeService.deleteEmployee(id, req.audit);
  res.status(200).json({ success: true, message: 'Employee deleted successfully' });
});
