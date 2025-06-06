import mongoose from 'mongoose';
import Employee from '../models/employee.model.js';
import SalaryPayment from '../models/salaryPayment.model.js';
import * as expenseService from './expenseService.js';

/**
 * Add a salary payment entry for an employee
 */
export async function addSalaryPayment(data, auditContext) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      employeeId,
      type,
      amount,
      description,
      paymentMethod,
      date = new Date()
    } = data;

    // 1. Validate employee exists and is active
    const employee = await Employee.findOne({ 
      _id: employeeId,
      status: 'active'
    })
    .session(session);

    // Set audit context for employee
    employee.$locals = {
      audit: {
        actorId: auditContext.actor.id,
        actorModel: auditContext.actor.model,
        ip: auditContext.ip,
        ua: auditContext.ua
      }
    };

    if (!employee) {
      throw new Error('Employee not found or inactive');
    }

    // 2. Create expense entry only for actual salary payments
    let expense = null;
    if (type === 'Salary Payment' || type === 'Advance Salary') {
      if (!paymentMethod) {
        throw new Error('Payment method is required for salary payments');
      }
      expense = await expenseService.recordExpense({
        date,
        category: type === 'Salary Payment' ? 'Salaries' : 'Advances',
        description,
        amount: -Math.abs(amount), // Ensure it's always negative for outflow
        paymentType: paymentMethod,
        paidTo: employeeId,
        paidToModel: 'Employee'
      }, {
        session,
        actor: auditContext.actor,
        ip: auditContext.ip,
        ua: auditContext.ua
      });
    }

    // 3. Create salary payment entry
    const payment = new SalaryPayment({
      employeeId,
      date,
      type,
      amount,
      description,
      ...((['Salary Payment', 'Advance Salary'].includes(type) && paymentMethod) && { paymentMethod }),
      expenseId: expense?._id // Only set if expense was created
    });

    // Set audit context for payment
    payment.$locals = {
      audit: {
        actorId: auditContext.actor.id,
        actorModel: auditContext.actor.model,
        ip: auditContext.ip,
        ua: auditContext.ua
      }
    };

    await payment.save({ session });

    // 4. Update employee's salary based on payment type
    if (type === 'Salary Payment') {
      // For actual salary payments, update the balance (negative because it's a payment)
      employee.salaryBalance -= amount;
    } else {
      // For other types, update the net salary
      const currentNet = employee.salary.net;
      let newNet = currentNet;

      switch (type) {
        case 'Extra Commission':
        case 'Recovery Award':
          newNet = currentNet + amount;
          break;
        case 'Advance Salary':
          if (!paymentMethod) {
            throw new Error('Payment method is required for advance salary');
          }
          newNet = currentNet - amount;
          break;
        case 'Deduction':
          newNet = currentNet - amount;
          break;
      }

      // Handle case where salary is a number instead of object
      const currentGross = typeof employee.salary === 'object' ? employee.salary.gross : employee.salary;
      employee.salary = {
        gross: currentGross,
        net: newNet,
        lastModified: date
      };
    }

    await employee.save({ session });

    await session.commitTransaction();
    
    return payment.toObject();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * Get salary payment history for an employee
 */
export async function getEmployeeSalaryHistory(employeeId, filters = {}) {
  const query = { employeeId };
  
  if (filters.from || filters.to) {
    query.date = {};
    if (filters.from) query.date.$gte = new Date(filters.from);
    if (filters.to) query.date.$lte = new Date(filters.to);
  }

  if (filters.type) {
    query.type = filters.type;
  }

  const payments = await SalaryPayment.find(query)
    .sort({ date: -1 })
    .lean();

  return payments;
}

/**
 * Get salary summary for an employee
 */
export async function getEmployeeSalarySummary(employeeId) {
  const employee = await Employee.findById(employeeId).lean();
  if (!employee) {
    throw new Error('Employee not found');
  }

  // Get total payments by type
  const summary = await SalaryPayment.aggregate([
    { $match: { employeeId: new mongoose.Types.ObjectId(employeeId) } },
    { $group: {
      _id: '$type',
      total: { $sum: '$amount' }
    }}
  ]);

  return {
    employee: {
      name: employee.name,
      salary: employee.salary,
      balance: employee.salaryBalance
    },
    payments: summary.reduce((acc, curr) => {
      acc[curr._id] = curr.total;
      return acc;
    }, {})
  };
}

/**
 * Update employee's base salary
 */
export async function updateEmployeeSalary(employeeId, { gross, net }, auditContext) {
  const employee = await Employee.findById(employeeId);

  if (!employee) {
    throw new Error('Employee not found');
  }

  // Only allow salary updates for active employees
  if (employee.status !== 'active') {
    throw new Error('Cannot update salary for inactive employee');
  }

  employee.salary = {
    gross,
    net,
    lastModified: new Date()
  };

  // Set audit context
  employee.$locals = {
    audit: {
      actorId: auditContext.actor.id,
      actorModel: auditContext.actor.model,
      ip: auditContext.ip,
      ua: auditContext.ua
    }
  };

  await employee.save();
  return employee.toObject();
} 