// src/services/payrollService.js
import mongoose from 'mongoose';
import Employee         from '../models/employee.model.js';
import SalesInvoice     from '../models/salesInvoice.model.js';
import SalesmanAdvance  from '../models/salesmanAdvance.model.js';
import * as expenseService from './expenseService.js';
import * as bankService from './bankService.js';
import * as invoiceService from './invoiceService.js';

const DEFAULT_BANK_ACCOUNT = process.env.DEFAULT_BANK_ACCOUNT || 'Main';

/**
 * Run payroll for a given month/year:
 *  - salary + all commission.balanceDue
 *  - minus all advances taken
 *  - records two Expense entries per salesman
 *  - marks those advances as recovered
 *  - updates each invoice to mark commissions as paid
 *
 * @param {Object} opts
 * @param {number} opts.month        – 1–12
 * @param {number} opts.year         – full year, e.g. 2025
 * @param {string} [opts.paymentDate] – ISO date string for the expense entries; defaults to month's end
 * @returns {Promise<Array>} Array of { salesmanId, name, salary, totalCommission, totalAdvances, netPay }
 */
export async function runPayroll({ month, year, paymentDate }, auditContext) {
  // 1) Compute date window
  const start = new Date(year, month - 1, 1);
  const end   = paymentDate
    ? new Date(paymentDate)
    : new Date(year, month, 0, 23, 59, 59);

  // 2) Find active salesmen
  const salesmen = await Employee.find({
    role: 'salesman',
    status: 'active'
  })
  .setOptions({
    actor: auditContext.actor,
    ip: auditContext.ip,
    ua: auditContext.ua
  })
  .lean();

  const results = [];

  for (const s of salesmen) {
    const sid = s._id;

    // 3) Find all invoices with outstanding commissions for this salesperson
    const invoicesWithCommission = await SalesInvoice.find({
      salesmanId: sid,
      date: { $gte: start, $lte: end },
      "commission.eligible": true,
      "commission.balanceDue": { $gt: 0 }
    }).lean();
    
    let totalCommission = 0;
    
    // Process each invoice with outstanding commission
    for (const invoice of invoicesWithCommission) {
      const commissionAmount = invoice.commission.balanceDue;
      totalCommission += commissionAmount;
      
      // Mark the commission as paid on the invoice
      try {
        await invoiceService.updateCommissionPayment(
          invoice._id,
          {
            amount: commissionAmount,
            method: 'Bank',
            date: end,
            note: `Commission paid as part of payroll for ${month}/${year}`
          },
          auditContext
        );
      } catch (err) {
        console.error(`Failed to update commission payment for invoice ${invoice._id}:`, err);
        // Continue processing other invoices even if one fails
      }
    }

    // 4) Sum up advances in period (unrecovered)
    const advAgg = await SalesmanAdvance.aggregate([
      { $match: {
          salesmanId: sid,
          date:       { $gte: start, $lte: end },
          recovered:  false
        }
      },
      { $group: {
          _id: null,
          totalAdvances: { $sum: '$amount' }
        }
      }
    ]);

    const totalAdvances = advAgg[0]?.totalAdvances || 0;

    // 5) Compute net pay
    const salary = s.salary;
    const gross   = salary + totalCommission;
    const netPay  = gross - totalAdvances;

    // 6) Record Expenses
    const payDate = end;
    // Salary expense & ledger
    const salaryExp = await expenseService.recordExpense({
      date:        payDate,
      category:    'Salaries',
      description: `Salary for ${s.name} (${month}/${year})`,
      amount:      salary,
      paymentType: 'Bank',
      paidTo:      sid,
      paidToModel: 'Employee'
    }, auditContext);

    // Advances (if any) expense & ledger
    if (totalAdvances > 0) {
      const advExp = await expenseService.recordExpense({
        date:        payDate,
        category:    'Advances Recovered',
        description: `Advances recovered from ${s.name} (${month}/${year})`,
        amount:      totalAdvances,
        paymentType: 'Bank',
        paidTo:      sid,
        paidToModel: 'Employee'
      }, auditContext);
    }

    // 7) Mark advances as recovered
    await SalesmanAdvance.updateMany(
      {
        salesmanId: sid,
        date:       { $gte: start, $lte: end },
        recovered:  false
      },
      { recovered: true },
      {
        actor: auditContext.actor,
        ip: auditContext.ip,
        ua: auditContext.ua
      }
    );

    // 8) Add to results
    results.push({
      salesmanId:     sid,
      name:          s.name,
      salary,
      totalCommission,
      totalAdvances,
      netPay
    });
  }

  return results;
}
