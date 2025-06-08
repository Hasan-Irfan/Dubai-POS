import mongoose from 'mongoose';
import SalesInvoice from '../models/salesInvoice.model.js';
import Expense from '../models/expense.model.js';
import Employee from '../models/employee.model.js';
import Vendor from '../models/vendor.model.js';

export async function getDashboardMetrics() {
  try {
    // Get all sales metrics
    const salesMetrics = await SalesInvoice.aggregate([
      {
        $match: {
          status: { $ne: 'deleted' }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totals.grandTotal' },
          totalProfit: { $sum: '$totals.totalProfit' },
          totalVat: { $sum: '$totals.totalVat' },
          grossProfit: { $sum: { $subtract: ['$totals.grandTotal', '$totals.totalCost'] } }
        }
      }
    ]);

    // Get credit and debit totals from sales
    const paymentMetrics = await SalesInvoice.aggregate([
      {
        $match: {
          status: { $ne: 'deleted' }
        }
      },
      {
        $unwind: '$payments'
      },
      {
        $group: {
          _id: '$payments.method',
          total: { $sum: '$payments.amount' }
        }
      }
    ]);

    // Get top 5 salesmen
    const topSalesmen = await SalesInvoice.aggregate([
      {
        $match: {
          status: { $ne: 'deleted' }
        }
      },
      {
        $group: {
          _id: '$salesmanId',
          totalSales: { $sum: '$totals.grandTotal' },
          totalTransactions: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: '$employee'
      },
      {
        $project: {
          _id: 1,
          name: '$employee.name',
          totalSales: 1,
          totalTransactions: 1,
          averageTransaction: { $divide: ['$totalSales', '$totalTransactions'] }
        }
      },
      {
        $sort: { totalSales: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Get top 5 vendors by transaction value
    const topVendors = await Expense.aggregate([
      {
        $match: {
          status: 'active',
          paidToModel: 'Vendor'
        }
      },
      {
        $group: {
          _id: '$paidTo',
          totalPurchases: { $sum: '$amount' },
          totalTransactions: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      {
        $unwind: '$vendor'
      },
      {
        $project: {
          _id: 1,
          name: '$vendor.name',
          totalPurchases: 1,
          totalTransactions: 1,
          averageTransaction: { $divide: ['$totalPurchases', '$totalTransactions'] }
        }
      },
      {
        $sort: { totalPurchases: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Calculate total expenses
    const expenseMetrics = await Expense.aggregate([
      {
        $match: {
          status: 'active'
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' }
        }
      }
    ]);

    // Format the response
    const metrics = {
      financial: {
        totalSales: salesMetrics[0]?.totalSales || 0,
        totalProfit: salesMetrics[0]?.totalProfit || 0,
        totalVat: salesMetrics[0]?.totalVat || 0,
        grossProfit: salesMetrics[0]?.grossProfit || 0,
        netProfit: (salesMetrics[0]?.totalProfit || 0) - (expenseMetrics[0]?.totalExpenses || 0),
        totalCredit: paymentMetrics.find(p => p._id === 'Cash')?.total || 0,
        totalDebit: paymentMetrics.find(p => p._id === 'Bank')?.total || 0,
        totalExpenses: expenseMetrics[0]?.totalExpenses || 0
      },
      topPerformers: {
        salesmen: topSalesmen,
        vendors: topVendors
      }
    };

    return metrics;
  } catch (error) {
    console.error('Error in getDashboardMetrics:', error);
    throw error;
  }
}

// Get metrics for a specific date range
export async function getDashboardMetricsForDateRange(startDate, endDate) {
  try {
    const dateMatch = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    // Get sales metrics for date range
    const salesMetrics = await SalesInvoice.aggregate([
      {
        $match: {
          ...dateMatch,
          status: { $ne: 'deleted' }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totals.grandTotal' },
          totalProfit: { $sum: '$totals.totalProfit' },
          totalVat: { $sum: '$totals.totalVat' },
          grossProfit: { $sum: { $subtract: ['$totals.grandTotal', '$totals.totalCost'] } }
        }
      }
    ]);

    // Get payment metrics for date range
    const paymentMetrics = await SalesInvoice.aggregate([
      {
        $match: {
          ...dateMatch,
          status: { $ne: 'deleted' }
        }
      },
      {
        $unwind: '$payments'
      },
      {
        $group: {
          _id: '$payments.method',
          total: { $sum: '$payments.amount' }
        }
      }
    ]);

    // Get top salesmen for date range
    const topSalesmen = await SalesInvoice.aggregate([
      {
        $match: {
          ...dateMatch,
          status: { $ne: 'deleted' }
        }
      },
      {
        $group: {
          _id: '$salesmanId',
          totalSales: { $sum: '$totals.grandTotal' },
          totalTransactions: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: '$employee'
      },
      {
        $project: {
          _id: 1,
          name: '$employee.name',
          totalSales: 1,
          totalTransactions: 1,
          averageTransaction: { $divide: ['$totalSales', '$totalTransactions'] }
        }
      },
      {
        $sort: { totalSales: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Get top vendors for date range
    const topVendors = await Expense.aggregate([
      {
        $match: {
          ...dateMatch,
          status: 'active',
          paidToModel: 'Vendor'
        }
      },
      {
        $group: {
          _id: '$paidTo',
          totalPurchases: { $sum: '$amount' },
          totalTransactions: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      {
        $unwind: '$vendor'
      },
      {
        $project: {
          _id: 1,
          name: '$vendor.name',
          totalPurchases: 1,
          totalTransactions: 1,
          averageTransaction: { $divide: ['$totalPurchases', '$totalTransactions'] }
        }
      },
      {
        $sort: { totalPurchases: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Get expense metrics for date range
    const expenseMetrics = await Expense.aggregate([
      {
        $match: {
          ...dateMatch,
          status: 'active'
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' }
        }
      }
    ]);

    // Format the response
    const metrics = {
      financial: {
        totalSales: salesMetrics[0]?.totalSales || 0,
        totalProfit: salesMetrics[0]?.totalProfit || 0,
        totalVat: salesMetrics[0]?.totalVat || 0,
        grossProfit: salesMetrics[0]?.grossProfit || 0,
        netProfit: (salesMetrics[0]?.totalProfit || 0) - (expenseMetrics[0]?.totalExpenses || 0),
        totalCredit: paymentMetrics.find(p => p._id === 'Cash')?.total || 0,
        totalDebit: paymentMetrics.find(p => p._id === 'Bank')?.total || 0,
        totalExpenses: expenseMetrics[0]?.totalExpenses || 0
      },
      topPerformers: {
        salesmen: topSalesmen,
        vendors: topVendors
      },
      dateRange: {
        startDate,
        endDate
      }
    };

    return metrics;
  } catch (error) {
    console.error('Error in getDashboardMetricsForDateRange:', error);
    throw error;
  }
} 