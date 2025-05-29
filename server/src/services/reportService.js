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
    // 1) CashRegister entries
    { $match: { date: { $gte: start, $lte: end } } },
    { $project: {
        desc:   '$reference',
        type:   { 
          $cond: [
            { $in: ['$type', ['Opening','Inflow']] },
            'credit',
            'debit'
          ]
        },
        amount: '$amount'
      }
    },

    // 2) Union BankTransaction entries
    { $unionWith: {
        coll: 'banktransactions',
        pipeline: [
          { $match: { date: { $gte: start, $lte: end } } },
          { $project: {
              desc:   '$reference',
              type:   {
                $cond: [
                  { $eq: ['$type','Outflow'] },
                  'debit',
                  'credit'
                ]
              },
              amount: '$amount'
            }
          }
        ]
      }
    },

    // 3) Union Expense entries (always debit)
    { $unionWith: {
        coll: 'expenses',
        pipeline: [
          { $match: { date: { $gte: start, $lte: end } } },
          { $project: {
              desc:   '$description',
              type:   'debit',
              amount: '$amount'
            }
          }
        ]
      }
    },

    // 4) Group by description & type
    { $group: {
        _id: { desc: '$desc', type: '$type' },
        total: { $sum: '$amount' }
      }
    },

    // 5) Shape into friendly docs
    { $project: {
        _id:        0,
        description:'$_id.desc',
        type:       '$_id.type',
        totalSAR:   '$total'
      }
    },

    // 6) Sort for consistent display
    { $sort: { description: 1 } }
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
