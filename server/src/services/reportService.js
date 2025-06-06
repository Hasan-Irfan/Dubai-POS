// src/services/reportService.js
import mongoose from 'mongoose';

/**
 * Produce a financial summary between two dates, grouping credits vs debits
 * by description (all in SAR), plus overall totals.
 *
 * @param {Object} opts
 * @param {string} opts.from  – ISO date string (inclusive)
 * @param {string} opts.to    – ISO date string (inclusive)
 * @returns {Promise<Object>} { summary: Array, totals: { creditSAR, debitSAR } }
 */
export async function getMonthlySummary({ from, to }, auditContext) {
  const start = new Date(from);
  const end   = new Date(to);

  // Use the raw collection for unionWith
  const coll = mongoose.connection.collection('cashregister');

  const pipeline = [
    // 1) Opening Balances Only
    { $match: { 
        type: 'Opening',
        status: 'active'
    }},
    { $project: {
        desc: 'Opening Balance - Cash',
        type: 'credit',
        amount: '$amount'
      }
    },

    // 2) Union Bank Opening Balances
    { $unionWith: {
        coll: 'banktransactions',
        pipeline: [
          { $match: { 
              type: 'Opening',
              status: 'active'
          }},
          { $project: {
              desc: { $concat: ['Opening Balance - ', { $ifNull: ['$method', 'Bank'] }] },
              type: 'credit',
              amount: '$amount'
            }
          }
        ]
      }
    },

    // 3) Union Sales Invoices - Only show payments
    { $unionWith: {
        coll: 'salesinvoices',
        pipeline: [
          { $match: { 
              date: { $gte: start, $lte: end },
              status: { $ne: 'deleted' },
              'payments.0': { $exists: true }  // Only invoices with payments
          }},
          // Unwind payments to handle each separately
          { $unwind: '$payments' },
          { $project: {
              desc: {
                $concat: [
                  'Sale Payment - Invoice #',
                  '$invoiceNumber',
                  ' (',
                  '$payments.method',
                  ')'
                ]
              },
              type: 'credit',
              amount: '$payments.amount'
          }}
        ]
      }
    },

    // 4) Union Vendor Transactions - only active entries
    { $unionWith: {
        coll: 'vendortransactions',
        pipeline: [
          { $match: { 
              date: { $gte: start, $lte: end },
              status: { $ne: 'deleted' }
          }},
          { $project: {
              desc: { 
                $cond: [
                  { $eq: ['$type', 'Purchase'] },
                  { $concat: ['Vendor Purchase: ', '$description'] },
                  { $concat: ['Vendor Payment: ', '$description, ', { $ifNull: ['$method', ''] }] }
                ]
              },
              type: {
                $cond: [
                  { $eq: ['$type', 'Purchase'] },
                  'debit',    // Purchase increases payable (debit)
                  'debit'     // Payment decreases cash/bank (debit)
                ]
              },
              amount: '$amount'
            }
          }
        ]
      }
    },

    // 5) Union Expense entries - only active entries
    { $unionWith: {
        coll: 'expenses',
        pipeline: [
          { $match: { 
              date: { $gte: start, $lte: end },
              status: { $ne: 'deleted' }
          }},
          { $project: {
              desc: {
                $concat: [
                  'Expense: ',
                  '$description',
                  ' (',
                  { $ifNull: ['$paymentType', 'Cash'] },
                  ')'
                ]
              },
              type: 'debit',
              amount: '$amount'
            }
          }
        ]
      }
    },

    // 6) Group by description & type
    { $group: {
        _id: { desc: '$desc', type: '$type' },
        total: { $sum: '$amount' }
      }
    },

    // 7) Shape into friendly docs
    { $project: {
        _id: 0,
        description: '$_id.desc',
        type: '$_id.type',
        totalSAR: '$total'
      }
    },

    // 8) Sort for consistent display - put opening balances first
    { $sort: { 
        description: {
          $cond: [
            { $regexMatch: { input: "$description", regex: /^Opening Balance/ } },
            0,
            1
          ]
        },
        type: -1,  // Credits before debits
        description: 1
    }}
  ];

  const summary = await coll.aggregate(pipeline).toArray();

  // Compute grand totals
  let creditSAR = 0, debitSAR = 0;
  for (const row of summary) {
    if (row.type === 'credit') creditSAR += row.totalSAR;
    else                       debitSAR  += row.totalSAR;
  }

  return {
    summary,
    totals: { creditSAR, debitSAR }
  };
}
