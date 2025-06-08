<?php
// FILE: ...\php-backend\src\Models\SalesInvoice.php

class SalesInvoice {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function createInvoice($invoiceData, $itemsData) {
        // Start a transaction to ensure all or nothing is saved
        $this->conn->begin_transaction();

        try {
            // 1. Insert into the main sales_invoices table
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

            // 2. Insert each item into the invoice_items table
            $query2 = "INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, cost_price, vat_amount, line_total) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmt2 = $this->conn->prepare($query2);

            foreach ($itemsData as $item) {
                $stmt2->bind_param("isidddd",
                    $invoice_id, $item['description'], $item['quantity'],
                    $item['unit_price'], $item['cost_price'], $item['vat_amount'], $item['line_total']
                );
                $stmt2->execute();
            }
            $stmt2->close();

            // 3. If all queries were successful, commit the transaction
            $this->conn->commit();
            return $invoice_id;

        } catch (Exception $e) {
            // If any query fails, roll back the entire transaction
            $this->conn->rollback();
            throw $e; // Re-throw the exception to be caught by the API script
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
    $base_query = " FROM sales_invoices si WHERE 1=1";
    $params = [];
    $types = "";

    // --- Build WHERE clause dynamically ---
    if (isset($options['filters']['status'])) {
        $base_query .= " AND si.status = ?";
        $params[] = $options['filters']['status'];
        $types .= "s";
    } else {
        $base_query .= " AND si.status != 'deleted'";
    }

    if (isset($options['filters']['salesmanId'])) {
        $base_query .= " AND si.salesman_id = ?";
        $params[] = $options['filters']['salesmanId'];
        $types .= "i";
    }

    if (isset($options['filters']['customerName'])) {
        $base_query .= " AND si.customer_name LIKE ?";
        $customerName = "%" . $options['filters']['customerName'] . "%";
        $params[] = $customerName;
        $types .= "s";
    }

    if (isset($options['from'])) {
        $base_query .= " AND si.invoice_date >= ?";
        $params[] = $options['from'];
        $types .= "s";
    }

    if (isset($options['to'])) {
        $base_query .= " AND si.invoice_date <= ?";
        $params[] = $options['to'];
        $types .= "s";
    }

    // --- First Query: Get total count for pagination ---
    $count_query = "SELECT count(si.id)" . $base_query;
    $stmt_count = $this->conn->prepare($count_query);
    if (!empty($params)) {
        $stmt_count->bind_param($types, ...$params);
    }
    $stmt_count->execute();
    $stmt_count->bind_result($total);
    $stmt_count->fetch();
    $stmt_count->close();

    // --- Second Query: Get the paginated list of main invoice data ---
    $sort_order = $options['sort'] === 'asc' ? 'ASC' : 'DESC';
    $sort_by = 'si.created_at'; // Default sort

    $data_query = "SELECT si.*, e.name as salesman_name" . $base_query . " LEFT JOIN employees e ON si.salesman_id = e.id ORDER BY " . $sort_by . " " . $sort_order . " LIMIT ? OFFSET ?";
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

    // Fetch all items for the retrieved invoices in one query
    $items_query = "SELECT * FROM invoice_items WHERE invoice_id IN ($placeholders)";
    $stmt_items = $this->conn->prepare($items_query);
    $stmt_items->bind_param(str_repeat('i', count($invoice_ids)), ...$invoice_ids);
    $stmt_items->execute();
    $items_result = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_items->close();

    // Fetch all payments for the retrieved invoices in one query
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
 * Soft deletes an invoice and removes its associated payments.
 * NOTE: This simplified version does not yet create reversal financial transactions.
 * @param int $id The ID of the invoice to delete.
 * @return bool True on success, false on failure.
 */
public function deleteInvoice($id) {
    $this->conn->begin_transaction();

    try {
        // For a soft delete, we will clear associated payments and then update the status.

        // 1. Delete associated payments from the invoice_payments table.
        $query_del_payments = "DELETE FROM invoice_payments WHERE invoice_id = ?";
        $stmt_del = $this->conn->prepare($query_del_payments);
        $stmt_del->bind_param("i", $id);
        $stmt_del->execute();
        $stmt_del->close();

        // 2. Soft-delete the main invoice record by updating its status and deleted_at timestamp.
        $query_update_invoice = "UPDATE sales_invoices SET status = 'deleted', deleted_at = NOW() WHERE id = ?";
        $stmt_update = $this->conn->prepare($query_update_invoice);
        $stmt_update->bind_param("i", $id);
        $stmt_update->execute();

        $affected_rows = $stmt_update->affected_rows;
        $stmt_update->close();

        // Commit the transaction
        $this->conn->commit();

        return $affected_rows > 0;

    } catch (Exception $e) {
        $this->conn->rollback();
        throw $e; // Re-throw the exception
    }
}
}
?>