// src/services/employeeService.js
import mongoose from 'mongoose';
import Employee from '../models/employee.model.js';

/**
 * Add a new employee
 * @param {Object} employeeData – { name, contact, role, hireDate, salary }
 */
export async function addEmployee(employeeData, auditContext) {

  const employee = new Employee(employeeData);
  
  // Set the audit context properly
  
  // employee.options = {
  //   actor: {
  //     id: auditContext.actor.id,
  //     model: auditContext.actor.model
  //   },
  //   ip: auditContext.ip,
  //   ua: auditContext.ua
  // };

  employee.$locals.audit = {
    actorId:    auditContext.actor.id,
    actorModel: auditContext.actor.model,
    ip:         auditContext.ip,
    ua:         auditContext.ua
  };
  
  const newEmp = await employee.save();
  return newEmp.toObject();
}

/**
 * List employees with filters, search, and pagination.
 * @param {Object} opts
 * @param {Object} opts.filters  – { role, status }
 * @param {string} opts.search   – matches name or contact.email
 * @param {number} opts.page     – defaults to 1
 * @param {number} opts.limit    – defaults to 10
 */
// export async function getAllEmployees({
//   filters = {},
//   search  = '',
//   page    = 1,
//   limit   = 10
// }, auditContext) {
//   const query = { ...filters };
//   if (search) {
//     query.$or = [
//       { name: { $regex: search, $options: 'i' } },
//       { 'contact.email': { $regex: search, $options: 'i' } },
//       { 'contact.phone': { $regex: search, $options: 'i' } }
//     ];
//   }

//   const skip = (page - 1) * limit;
//   const [ total, employees ] = await Promise.all([
//     Employee.countDocuments(query),
//     Employee.find(query)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .setOptions({ 
//         actor: auditContext.actor,
//         ip: auditContext.ip,
//         ua: auditContext.ua
//       })
//   ]);

//   return {
//     employees,
//     pagination: {
//       total,
//       page,
//       limit,
//       totalPages:  Math.ceil(total / limit),
//       hasNextPage: page < Math.ceil(total / limit),
//       hasPrevPage: page > 1
//     }
//   };
// }

export async function getAllEmployees(
  { filters = {}, search = '', page = 1, limit = 10 } = {},
  /* auditContext (optional) */
) {
  // 1) Build the Mongo query
  const query = {};
  if (filters.role)   query.role   = filters.role;
  if (filters.status) query.status = filters.status;

  if (search) {
    const re = new RegExp(search, 'i');
    query.$or = [
      { name:           re },
      { 'contact.email':re },
      { 'contact.phone':re }
    ];
  }

  // 2) Pagination math
  const skip = (page - 1) * limit;

  // 3) Fire both count + find
  const [ total, employees ] = await Promise.all([
    Employee.countDocuments(query),
    Employee.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()      // return plain JS objects
  ]);

  // 4) Package up your response
  return {
    employees,
    pagination: {
      total,
      page,
      limit,
      totalPages:  Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
}

/**
 * Fetch a single employee by ID
 */
export async function getEmployeeById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid employee ID');
  }
  const emp = await Employee.findById(id).lean();
  if (!emp) {
    throw new Error('Employee not found');
  }
  return emp;
}

/**
 * Update an employee's fields
 */
export async function updateEmployee(id, updateData, auditContext) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid employee ID');
  }
  const emp = await Employee.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
      actor: auditContext.actor,
      ip: auditContext.ip,
      ua: auditContext.ua
    }
  )
  .lean();
  if (!emp) {
    throw new Error('Employee not found');
  }
  return emp;
}

/**
 * Soft-delete (deactivate) or hard-delete an employee.
 */
export async function deleteEmployee(id, auditContext) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid employee ID');
  }

  let emp;

    emp = await Employee.findByIdAndDelete(
      id,
      {
        new: true,
        actor: auditContext.actor,
        ip: auditContext.ip,
        ua: auditContext.ua
      }
    )
    .lean();
  

  if (!emp) {
    throw new Error('Employee not found');
  }
  return emp;
}
