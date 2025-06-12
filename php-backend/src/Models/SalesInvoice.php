<?php
// FILE: ...\php-backend\src\Models\SalesInvoice.php

require_once __DIR__ . '/CashRegister.php';
require_once __DIR__ . '/BankTransaction.php';

class SalesInvoice {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }


     public function createInvoice($invoiceData, $itemsData, $paymentsData = null) {
        $this->conn->begin_transaction();
        try {
            // 1. Insert the main invoice record with a default status of 'Unpaid'
            $query1 = "INSERT INTO sales_invoices (invoice_number, customer_name, salesman_id, sub_total, total_vat, grand_total, total_cost, total_profit, invoice_date) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt1 = $this->conn->prepare($query1);
            $stmt1->bind_param("ssisdddds",
                $invoiceData['invoice_number'], $invoiceData['customer_name'], $invoiceData['salesman_id'],
                $invoiceData['sub_total'], $invoiceData['total_vat'], $invoiceData['grand_total'],
                $invoiceData['total_cost'], $invoiceData['total_profit'], $invoiceData['invoice_date']
            );
            $stmt1->execute();
            $invoice_id = $stmt1->insert_id;
            $stmt1->close();

            if (!$invoice_id) {
                throw new Exception("Failed to create main invoice record.");
            }

            // 2. Insert invoice items
            $query2 = "INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, cost_price, vat_amount, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmt2 = $this->conn->prepare($query2);
            foreach ($itemsData as $item) {
                $stmt2->bind_param("isidddd", $invoice_id, $item['description'], $item['quantity'], $item['unit_price'], $item['cost_price'], $item['vat_amount'], $item['line_total']);
                $stmt2->execute();
            }
            $stmt2->close();
            
            // 3. Process initial payments, if any
            $totalPaid = 0;
            if ($paymentsData && count($paymentsData) > 0) {
                foreach ($paymentsData as $payment) {
                    $this->addPayment($invoice_id, $payment); // Reuse the addPayment logic within the transaction
                    $totalPaid += $payment['amount'];
                }
            }
            
            // 4. Update the final status of the invoice based on payments
            $finalStatus = 'Unpaid';
            if ($totalPaid > 0) {
                $finalStatus = ($totalPaid >= $invoiceData['grand_total']) ? 'Paid' : 'Partially Paid';
            }
            
            $updateStatusQuery = "UPDATE sales_invoices SET status = ? WHERE id = ?";
            $stmtUpdate = $this->conn->prepare($updateStatusQuery);
            $stmtUpdate->bind_param("si", $finalStatus, $invoice_id);
            $stmtUpdate->execute();
            $stmtUpdate->close();

            $this->conn->commit();
            return $invoice_id;

        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    public function findInvoiceById($id) {
        $invoice_query = "SELECT si.*, e.name as salesman_name FROM sales_invoices si 
                          LEFT JOIN employees e ON si.salesman_id = e.id
                          WHERE si.id = ? AND si.status != 'deleted'";
        $stmt = $this->conn->prepare($invoice_query);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $invoice_result = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$invoice_result) return null;

        $items_query = "SELECT * FROM invoice_items WHERE invoice_id = ?";
        $stmt = $this->conn->prepare($items_query);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $items_result = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        $payments_query = "SELECT * FROM invoice_payments WHERE invoice_id = ?";
        $stmt = $this->conn->prepare($payments_query);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $payments_result = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        // Assemble the final object
        return [
            'invoice' => $invoice_result,
            'items' => $items_result,
            'payments' => $payments_result
        ];
    }

    /**
     * Fetches a paginated and filtered list of sales invoices.
     * @param array $options Contains filters, sorting, and pagination data.
     * @return array An array containing the list of invoices and the total count.
     */
    public function getAllInvoices($options) {
        // Corrected Method
        $params = [];
        $types = "";

        // Start with the base query including the JOIN
        $base_query = " FROM sales_invoices si LEFT JOIN employees e ON si.salesman_id = e.id";

        // Build WHERE clause dynamically
        $where_clause = " WHERE 1=1";
        if (isset($options['filters']['status'])) {
            $where_clause .= " AND si.status = ?";
            $params[] = $options['filters']['status'];
            $types .= "s";
        } else {
            $where_clause .= " AND si.status != 'deleted'";
        }

        if (isset($options['filters']['salesmanId'])) {
            $where_clause .= " AND si.salesman_id = ?";
            $params[] = $options['filters']['salesmanId'];
            $types .= "i";
        }

        if (isset($options['filters']['customerName'])) {
            $where_clause .= " AND si.customer_name LIKE ?";
            $customerName = "%" . $options['filters']['customerName'] . "%";
            $params[] = $customerName;
            $types .= "s";
        }

        if (isset($options['from'])) {
            $where_clause .= " AND si.invoice_date >= ?";
            $params[] = $options['from'];
            $types .= "s";
        }

        if (isset($options['to'])) {
            $where_clause .= " AND si.invoice_date <= ?";
            $params[] = $options['to'];
            $types .= "s";
        }

        // --- First Query: Get total count for pagination ---
        $count_query = "SELECT count(si.id)" . $base_query . $where_clause;
        $stmt_count = $this->conn->prepare($count_query);
        if (!empty($params)) {
            $stmt_count->bind_param($types, ...$params);
        }
        $stmt_count->execute();
        $stmt_count->bind_result($total);
        $stmt_count->fetch();
        $stmt_count->close();

        // --- Second Query: Get the paginated list of main invoice data ---
        $sort_order = ($options['sort'] ?? 'desc') === 'asc' ? 'ASC' : 'DESC';
        $sort_by = 'si.created_at'; // Default sort

        // Combine all parts for the final data query
        $data_query = "SELECT si.*, e.name as salesman_name" . $base_query . $where_clause . " ORDER BY " . $sort_by . " " . $sort_order . " LIMIT ? OFFSET ?";
        
        // Add limit and offset to parameters
        $params[] = $options['limit'];
        $params[] = $options['offset'];
        $types .= "ii";

        $stmt_data = $this->conn->prepare($data_query);
        $stmt_data->bind_param($types, ...$params);
        $stmt_data->execute();
        $invoices_result = $stmt_data->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_data->close();

        if (empty($invoices_result)) {
            return ['total' => 0, 'invoices' => []];
        }

        // --- Efficiently fetch related items and payments ---
        $invoice_ids = array_column($invoices_result, 'id');
        $placeholders = implode(',', array_fill(0, count($invoice_ids), '?'));

        $items_query = "SELECT * FROM invoice_items WHERE invoice_id IN ($placeholders)";
        $stmt_items = $this->conn->prepare($items_query);
        $stmt_items->bind_param(str_repeat('i', count($invoice_ids)), ...$invoice_ids);
        $stmt_items->execute();
        $items_result = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_items->close();
        
        $payments_query = "SELECT * FROM invoice_payments WHERE invoice_id IN ($placeholders)";
        $stmt_payments = $this->conn->prepare($payments_query);
        $stmt_payments->bind_param(str_repeat('i', count($invoice_ids)), ...$invoice_ids);
        $stmt_payments->execute();
        $payments_result = $stmt_payments->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_payments->close();

        // --- Map items and payments back to their invoices ---
        $items_by_invoice = [];
        foreach ($items_result as $item) {
            $items_by_invoice[$item['invoice_id']][] = $item;
        }

        $payments_by_invoice = [];
        foreach ($payments_result as $payment) {
            $payments_by_invoice[$payment['invoice_id']][] = $payment;
        }

        // Assemble the final nested structure
        $assembled_invoices = [];
        foreach ($invoices_result as $invoice) {
            $invoice_id = $invoice['id'];
            $assembled_invoices[] = [
                'invoice' => $invoice,
                'items' => $items_by_invoice[$invoice_id] ?? [],
                'payments' => $payments_by_invoice[$invoice_id] ?? []
            ];
        }

        return ['total' => $total, 'invoices' => $assembled_invoices];
    }
    /**
     * Updates an invoice and its items within a transaction.
     * @param int $id The ID of the invoice to update.
     * @param array $invoiceUpdateData The main invoice data to update.
     * @param array|null $itemsUpdateData The new set of items (if they are being updated).
     * @return bool True on success, false on failure.
     */
    public function updateInvoice($id, $invoiceUpdateData, $itemsUpdateData = null) {
        $this->conn->begin_transaction();

        try {
            // --- Update main invoice record ---
            $query_parts = [];
            $params = [];
            $types = "";

            foreach ($invoiceUpdateData as $key => $value) {
                $query_parts[] = "`$key` = ?";
                $params[] = $value;
                $types .= is_int($value) ? "i" : (is_float($value) ? "d" : "s");
            }

            $params[] = $id;
            $types .= "i";

            $query1 = "UPDATE sales_invoices SET " . implode(", ", $query_parts) . " WHERE id = ?";
            $stmt1 = $this->conn->prepare($query1);
            $stmt1->bind_param($types, ...$params);
            $stmt1->execute();
            $stmt1->close();

            // --- If items are being updated, replace them ---
            if ($itemsUpdateData !== null) {
                // 1. Delete old items
                $query_del = "DELETE FROM invoice_items WHERE invoice_id = ?";
                $stmt_del = $this->conn->prepare($query_del);
                $stmt_del->bind_param("i", $id);
                $stmt_del->execute();
                $stmt_del->close();

                // 2. Insert new items
                $query_ins = "INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, cost_price, vat_amount, line_total) 
                            VALUES (?, ?, ?, ?, ?, ?, ?)";
                $stmt_ins = $this->conn->prepare($query_ins);
                foreach ($itemsUpdateData as $item) {
                    $stmt_ins->bind_param("isidddd",
                        $id, $item['description'], $item['quantity'],
                        $item['unit_price'], $item['cost_price'], $item['vat_amount'], $item['line_total']
                    );
                    $stmt_ins->execute();
                }
                $stmt_ins->close();
            }

            // If all queries succeeded, commit the transaction
            $this->conn->commit();
            return true;

        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }
    /**
     * Soft deletes an invoice, creates financial reversals for all its payments,
     * and recalculates subsequent balances.
     * @param int $id The ID of the invoice to delete.
     * @return bool True on success, false on failure.
     */
    public function deleteInvoice($id) {
        $this->conn->begin_transaction();

        try {
            // 1. Get the full invoice details, including payments, before deleting.
            $invoice_data = $this->findInvoiceById($id);
            if (!$invoice_data || $invoice_data['invoice']['status'] === 'deleted') {
                $this->conn->rollback();
                return false;
            }
            foreach ($invoice_data['payments'] as $payment) {
                $reversal_reference = "Reversal of payment for deleted Invoice #" . $invoice_data['invoice']['invoice_number'];
                
                if ($payment['method'] === 'Cash') {
                    $cash_model = new CashRegister($this->conn);
                    $cash_model->recordCashEntry([
                        'date' => date('Y-m-d H:i:s'),
                        'type' => 'Outflow',
                        'reference' => $reversal_reference,
                        'amount' => $payment['amount']
                    ]);
                } else { 
                    $bank_model = new BankTransaction($this->conn);
                    $bank_model->recordTransaction([
                        'date' => date('Y-m-d H:i:s'),
                        'type' => 'Outflow',
                        'method' => $payment['method'],
                        'reference' => $reversal_reference,
                        'amount' => $payment['amount']
                    ]);
                }
            }
            
            $query_del_payments = "DELETE FROM invoice_payments WHERE invoice_id = ?";
            $stmt_del = $this->conn->prepare($query_del_payments);
            $stmt_del->bind_param("i", $id);
            $stmt_del->execute();
            $stmt_del->close();
            
            $query_update_invoice = "UPDATE sales_invoices SET status = 'deleted', deleted_at = NOW() WHERE id = ?";
            $stmt_update = $this->conn->prepare($query_update_invoice);
            $stmt_update->bind_param("i", $id);
            $stmt_update->execute();
            
            $affected_rows = $stmt_update->affected_rows;
            $stmt_update->close();

            $this->conn->commit();

            return $affected_rows > 0;

        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e; 
        }
    }
    /**
 * Adds a new payment to an existing invoice and records the corresponding ledger entry.
 * @param int $invoiceId The ID of the invoice receiving the payment.
 * @param array $paymentData Contains amount, method, and date.
 * @return bool True on success, false on failure.
 */
    public function addPayment($invoiceId, $paymentData) {
        $this->conn->begin_transaction();
        try {
            // 1. Get the current invoice and lock it for the transaction
            $invoiceQuery = "SELECT * FROM sales_invoices WHERE id = ? FOR UPDATE";
            $stmt = $this->conn->prepare($invoiceQuery);
            $stmt->bind_param("i", $invoiceId);
            $stmt->execute();
            $invoice = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if (!$invoice) {
                throw new Exception("Invoice not found.");
            }
            if ($invoice['status'] === 'deleted') {
                throw new Exception("Cannot add payment to a deleted invoice.");
            }
            if ($invoice['status'] === 'Paid') {
                throw new Exception("Invoice is already fully paid.");
            }

            // 2. Calculate current paid amount and remaining balance
            $paymentsQuery = "SELECT SUM(amount) as totalPaid FROM invoice_payments WHERE invoice_id = ?";
            $stmt_paid = $this->conn->prepare($paymentsQuery);
            $stmt_paid->bind_param("i", $invoiceId);
            $stmt_paid->execute();
            $paidResult = $stmt_paid->get_result()->fetch_assoc();
            $stmt_paid->close();

            $currentPaidAmount = $paidResult['totalPaid'] ?? 0;
            $remainingBalance = $invoice['grand_total'] - $currentPaidAmount;

            if ($paymentData['amount'] > round($remainingBalance, 2) + 0.001) { 
                throw new Exception("Payment amount exceeds the remaining balance of " . round($remainingBalance, 2));
            }

            // 3. Insert the new payment record
            $payment_id = uniqid('pay_'); // Generate a unique ID for the payment
            
            $insertPaymentQuery = "INSERT INTO invoice_payments (id, invoice_id, payment_date, amount, method, account) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt_insert_pay = $this->conn->prepare($insertPaymentQuery);
            $paymentDate = $paymentData['date'] ?? date('Y-m-d H:i:s');
            $account = $paymentData['account'] ?? null;
            $stmt_insert_pay->bind_param("sisdss", $payment_id, $invoiceId, $paymentDate, $paymentData['amount'], $paymentData['method'], $account);
            $stmt_insert_pay->execute();
            $stmt_insert_pay->close();

            // 4. Create the corresponding Cash or Bank ledger entry
            $reference = "Payment for Invoice #" . $invoice['invoice_number'];
            if ($paymentData['method'] === 'Cash') {
                $cash_model = new CashRegister($this->conn);
                $cash_model->recordCashEntry(['date' => $paymentDate, 'type' => 'Inflow', 'reference' => $reference, 'amount' => $paymentData['amount']]);
            } else {
                $bank_model = new BankTransaction($this->conn);
                $bank_model->recordTransaction(['date' => $paymentDate, 'type' => 'Inflow', 'method' => $paymentData['method'], 'reference' => $reference, 'amount' => $paymentData['amount']]);
            }

            // 5. Update the invoice status
            $newPaidAmount = $currentPaidAmount + $paymentData['amount'];
            $newStatus = 'Partially Paid';
            if ($newPaidAmount >= $invoice['grand_total']) {
                $newStatus = 'Paid';
            }

            $updateInvoiceQuery = "UPDATE sales_invoices SET status = ? WHERE id = ?";
            $stmt_update_inv = $this->conn->prepare($updateInvoiceQuery);
            $stmt_update_inv->bind_param("si", $newStatus, $invoiceId);
            $stmt_update_inv->execute();
            $stmt_update_inv->close();

            $this->conn->commit();
            return true;

        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }
    /**
     * Reverses a single payment on an invoice, creates a financial reversal,
     * and updates the invoice status accordingly.
     * @param int $invoiceId The ID of the invoice.
     * @param string $paymentId The unique ID of the payment to reverse.
     * @param string $reason The reason for the reversal.
     * @return bool True on success, false on failure.
     */
    public function reversePayment($invoiceId, $paymentId, $reason) {
        $this->conn->begin_transaction();
        try {
            // 1. Find the specific payment to be reversed.
            $paymentQuery = "SELECT * FROM invoice_payments WHERE id = ? AND invoice_id = ?";
            $stmt_pay = $this->conn->prepare($paymentQuery);
            $stmt_pay->bind_param("si", $paymentId, $invoiceId);
            $stmt_pay->execute();
            $payment = $stmt_pay->get_result()->fetch_assoc();
            $stmt_pay->close();

            if (!$payment) {
                throw new Exception("Payment with ID $paymentId not found on invoice $invoiceId.");
            }

            // 2. Create the financial reversal in the correct ledger.
            $reversal_reference = "Reversal for Invoice #" . $invoiceId . ": " . $reason;
            if ($payment['method'] === 'Cash') {
                $cash_model = new CashRegister($this->conn);
                $cash_model->recordCashEntry(['date' => date('Y-m-d H:i:s'), 'type' => 'Outflow', 'reference' => $reversal_reference, 'amount' => $payment['amount']]);
            } else { // Bank or Shabka
                $bank_model = new BankTransaction($this->conn);
                $bank_model->recordTransaction(['date' => date('Y-m-d H:i:s'), 'type' => 'Outflow', 'method' => $payment['method'], 'reference' => $reversal_reference, 'amount' => $payment['amount']]);
            }

            // 3. Delete the payment record from the invoice.
            $deleteQuery = "DELETE FROM invoice_payments WHERE id = ?";
            $stmt_del = $this->conn->prepare($deleteQuery);
            $stmt_del->bind_param("s", $paymentId);
            $stmt_del->execute();
            $stmt_del->close();

            // 4. Recalculate the invoice's status.
            $invoiceQuery = "SELECT grand_total FROM sales_invoices WHERE id = ?";
            $stmt_inv = $this->conn->prepare($invoiceQuery);
            $stmt_inv->bind_param("i", $invoiceId);
            $stmt_inv->execute();
            $invoice = $stmt_inv->get_result()->fetch_assoc();
            $stmt_inv->close();

            $paymentsQuery = "SELECT SUM(amount) as totalPaid FROM invoice_payments WHERE invoice_id = ?";
            $stmt_paid = $this->conn->prepare($paymentsQuery);
            $stmt_paid->bind_param("i", $invoiceId);
            $stmt_paid->execute();
            $paidResult = $stmt_paid->get_result()->fetch_assoc();
            $stmt_paid->close();

            $currentPaidAmount = $paidResult['totalPaid'] ?? 0;

            $newStatus = 'Unpaid';
            if ($currentPaidAmount > 0) {
                $newStatus = ($currentPaidAmount >= $invoice['grand_total']) ? 'Paid' : 'Partially Paid';
            }

            $updateInvoiceQuery = "UPDATE sales_invoices SET status = ? WHERE id = ?";
            $stmt_update_inv = $this->conn->prepare($updateInvoiceQuery);
            $stmt_update_inv->bind_param("si", $newStatus, $invoiceId);
            $stmt_update_inv->execute();
            $stmt_update_inv->close();

            $this->conn->commit();
            return true;

        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }
}
?>