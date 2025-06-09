<?php
// FILE: ...\php-backend\src\Models\Dashboard.php

class Dashboard {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Fetches all-time key performance indicators for the dashboard.
     * @return array An associative array of all calculated metrics.
     */
    public function getDashboardMetrics() {
        $metrics = [];

        // 1. Financial Summary from Sales Invoices
        $query_sales = "SELECT 
                            SUM(grand_total) as totalSales,
                            SUM(total_profit) as totalProfit,
                            SUM(total_vat) as totalVat
                        FROM sales_invoices WHERE status != 'deleted'";
        $metrics['financial'] = $this->conn->query($query_sales)->fetch_assoc();

        // 2. Total Payments by Method
        $query_payments = "SELECT method, SUM(amount) as total FROM invoice_payments GROUP BY method";
        $payments_result = $this->conn->query($query_payments)->fetch_all(MYSQLI_ASSOC);
        $metrics['payments'] = [];
        foreach ($payments_result as $row) {
            $metrics['payments'][$row['method']] = (float)$row['total'];
        }

        // 3. Total Expenses
        $query_expenses = "SELECT SUM(amount) as totalExpenses FROM expenses WHERE status = 'active'";
        $metrics['financial']['totalExpenses'] = (float)$this->conn->query($query_expenses)->fetch_assoc()['totalExpenses'];

        // 4. Top 5 Salesmen
        $query_salesmen = "SELECT 
                            e.name, 
                            SUM(si.grand_total) as totalSales,
                            COUNT(si.id) as totalTransactions
                           FROM sales_invoices si
                           JOIN employees e ON si.salesman_id = e.id
                           WHERE si.status != 'deleted'
                           GROUP BY e.id, e.name
                           ORDER BY totalSales DESC
                           LIMIT 5";
        $metrics['topSalesmen'] = $this->conn->query($query_salesmen)->fetch_all(MYSQLI_ASSOC);

        // 5. Top 5 Vendors (by expense)
        $query_vendors = "SELECT
                            v.name,
                            SUM(ex.amount) as totalPurchases,
                            COUNT(ex.id) as totalTransactions
                          FROM expenses ex
                          JOIN vendors v ON ex.paid_to_id = v.id
                          WHERE ex.status = 'active' AND ex.paid_to_model = 'Vendor'
                          GROUP BY v.id, v.name
                          ORDER BY totalPurchases DESC
                          LIMIT 5";
        $metrics['topVendors'] = $this->conn->query($query_vendors)->fetch_all(MYSQLI_ASSOC);

        return $metrics;
    }
    /**
 * Fetches key performance indicators for a specific date range.
 * @param string $startDate The start date in 'Y-m-d' format.
 * @param string $endDate The end date in 'Y-m-d' format.
 * @return array An associative array of all calculated metrics for the range.
 */
public function getDashboardMetricsForDateRange($startDate, $endDate) {
    $metrics = [];
    $startDate .= ' 00:00:00'; // Include the whole start day
    $endDate .= ' 23:59:59';   // Include the whole end day

    // 1. Financial Summary from Sales Invoices within date range
    $query_sales = "SELECT 
                        SUM(grand_total) as totalSales,
                        SUM(total_profit) as totalProfit,
                        SUM(total_vat) as totalVat
                    FROM sales_invoices 
                    WHERE status != 'deleted' AND invoice_date BETWEEN ? AND ?";
    $stmt_sales = $this->conn->prepare($query_sales);
    $stmt_sales->bind_param("ss", $startDate, $endDate);
    $stmt_sales->execute();
    $metrics['financial'] = $stmt_sales->get_result()->fetch_assoc();
    $stmt_sales->close();

    // 2. Total Payments by Method within date range
    $query_payments = "SELECT p.method, SUM(p.amount) as total 
                       FROM invoice_payments p
                       JOIN sales_invoices si ON p.invoice_id = si.id
                       WHERE si.status != 'deleted' AND p.payment_date BETWEEN ? AND ?
                       GROUP BY p.method";
    $stmt_payments = $this->conn->prepare($query_payments);
    $stmt_payments->bind_param("ss", $startDate, $endDate);
    $stmt_payments->execute();
    $payments_result = $stmt_payments->get_result()->fetch_all(MYSQLI_ASSOC);
    $metrics['payments'] = [];
    foreach ($payments_result as $row) {
        $metrics['payments'][$row['method']] = (float)$row['total'];
    }
    $stmt_payments->close();

    // 3. Total Expenses within date range
    $query_expenses = "SELECT SUM(amount) as totalExpenses FROM expenses WHERE status = 'active' AND entry_date BETWEEN ? AND ?";
    $stmt_expenses = $this->conn->prepare($query_expenses);
    $stmt_expenses->bind_param("ss", $startDate, $endDate);
    $stmt_expenses->execute();
    $metrics['financial']['totalExpenses'] = (float)$stmt_expenses->get_result()->fetch_assoc()['totalExpenses'];
    $stmt_expenses->close();

    // 4. Top 5 Salesmen within date range
    $query_salesmen = "SELECT e.name, SUM(si.grand_total) as totalSales, COUNT(si.id) as totalTransactions
                       FROM sales_invoices si JOIN employees e ON si.salesman_id = e.id
                       WHERE si.status != 'deleted' AND si.invoice_date BETWEEN ? AND ?
                       GROUP BY e.id, e.name ORDER BY totalSales DESC LIMIT 5";
    $stmt_salesmen = $this->conn->prepare($query_salesmen);
    $stmt_salesmen->bind_param("ss", $startDate, $endDate);
    $stmt_salesmen->execute();
    $metrics['topSalesmen'] = $stmt_salesmen->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_salesmen->close();

    // 5. Top 5 Vendors within date range
    $query_vendors = "SELECT v.name, SUM(ex.amount) as totalPurchases, COUNT(ex.id) as totalTransactions
                      FROM expenses ex JOIN vendors v ON ex.paid_to_id = v.id
                      WHERE ex.status = 'active' AND ex.paid_to_model = 'Vendor' AND ex.entry_date BETWEEN ? AND ?
                      GROUP BY v.id, v.name ORDER BY totalPurchases DESC LIMIT 5";
    $stmt_vendors = $this->conn->prepare($query_vendors);
    $stmt_vendors->bind_param("ss", $startDate, $endDate);
    $stmt_vendors->execute();
    $metrics['topVendors'] = $stmt_vendors->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_vendors->close();

    return $metrics;
}
}
?>