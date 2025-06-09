<?php
// FILE: ...\php-backend\src\Models\Report.php

class Report {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Produces a financial summary between two dates.
     * This query combines multiple tables to create a list of all credits and debits.
     * @param string $startDate The start date in 'Y-m-d H:i:s' format.
     * @param string $endDate The end date in 'Y-m-d H:i:s' format.
     * @return array An associative array containing the summary list and totals.
     */
    public function getMonthlySummary($startDate, $endDate) {
        // Note: This is a complex query that uses UNION ALL to combine results
        // from different sources into a single financial summary report.
        $sql = "
            (SELECT 
                'Opening Balance - Cash' as description, 
                'credit' as type, 
                amount,
                entry_date as date
             FROM cash_register WHERE type = 'Opening' AND status = 'active'
            )
            UNION ALL
            (SELECT 
                CONCAT('Opening Balance - ', method) as description, 
                'credit' as type, 
                amount,
                entry_date as date
             FROM bank_transactions WHERE type = 'Opening' AND status = 'active'
            )
            UNION ALL
            (SELECT 
                CONCAT('Sale Payment - Invoice #', si.invoice_number, ' (', p.method, ')') as description,
                'credit' as type,
                p.amount,
                p.payment_date as date
             FROM invoice_payments p
             JOIN sales_invoices si ON p.invoice_id = si.id
             WHERE p.payment_date BETWEEN ? AND ?
            )
            UNION ALL
            (SELECT 
                description,
                'debit' as type,
                amount,
                entry_date as date
             FROM expenses
             WHERE status = 'active' AND entry_date BETWEEN ? AND ?
            )
            ORDER BY date
        ";

        $stmt = $this->conn->prepare($sql);
        // We bind the date range parameters for the two subqueries that use them.
        $stmt->bind_param("ssss", $startDate, $endDate, $startDate, $endDate);
        $stmt->execute();

        $summary_result = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        // Calculate totals manually from the combined result
        $totals = [
            'creditSAR' => 0,
            'debitSAR' => 0
        ];
        foreach($summary_result as $row) {
            if ($row['type'] === 'credit') {
                $totals['creditSAR'] += $row['amount'];
            } else {
                $totals['debitSAR'] += $row['amount'];
            }
        }

        return ['summary' => $summary_result, 'totals' => $totals];
    }
}
?>