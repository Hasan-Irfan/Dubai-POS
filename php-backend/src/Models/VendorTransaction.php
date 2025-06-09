<?php
// FILE: ...\php-backend\src\Models\VendorTransaction.php

class VendorTransaction {
    private $conn;
    private $table_name = "vendor_transactions";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function addTransaction($data) {
        $this->conn->begin_transaction();
        try {
            // 1. Get vendor's opening balance and the last transaction's balance
            $vendor_query = "SELECT opening_balance FROM vendors WHERE id = ?";
            $stmt_v = $this->conn->prepare($vendor_query);
            $stmt_v->bind_param("i", $data['vendor_id']);
            $stmt_v->execute();
            $vendor = $stmt_v->get_result()->fetch_assoc();
            $stmt_v->close();
            if (!$vendor) throw new Exception("Vendor not found.");

            $last_txn_query = "SELECT balance FROM " . $this->table_name . " WHERE vendor_id = ? AND status = 'active' ORDER BY entry_date DESC, id DESC LIMIT 1";
            $stmt_lt = $this->conn->prepare($last_txn_query);
            $stmt_lt->bind_param("i", $data['vendor_id']);
            $stmt_lt->execute();
            $last_txn = $stmt_lt->get_result()->fetch_assoc();
            $stmt_lt->close();

            $last_balance = $last_txn ? $last_txn['balance'] : $vendor['opening_balance'];

            // 2. Calculate new balance
            $new_balance = $data['type'] === 'Purchase' ? $last_balance + $data['amount'] : $last_balance - $data['amount'];

            // 3. If it's a payment, create the ledger entry
            $ledger_entry_id = null;
            $ledger_entry_model = null;
            if ($data['type'] === 'Payment') {
                $reference = "Payment to Vendor: " . ($data['description'] ?? 'N/A');
                if ($data['method'] === 'Cash') {
                    $cash_model = new CashRegister($this->conn);
                    $ledger_entry_id = $cash_model->recordCashEntry(['date' => $data['date'], 'type' => 'Outflow', 'reference' => $reference, 'amount' => $data['amount']]);
                    $ledger_entry_model = 'CashRegister';
                } else { // Bank or Shabka
                    $bank_model = new BankTransaction($this->conn);
                    $ledger_entry_id = $bank_model->recordTransaction(['date' => $data['date'], 'type' => 'Outflow', 'method' => $data['method'], 'reference' => $reference, 'amount' => $data['amount']]);
                    $ledger_entry_model = 'BankTransaction';
                }
                if (!$ledger_entry_id) throw new Exception("Failed to create ledger transaction for payment.");
            }

            // 4. Create the vendor transaction record
            $query = "INSERT INTO " . $this->table_name . " (vendor_id, type, description, amount, balance, entry_date, method, ledger_entry_id, ledger_entry_model) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->conn->prepare($query);
            $entry_date = $data['date'] ?? date('Y-m-d H:i:s');
            $method = $data['type'] === 'Payment' ? $data['method'] : null;
            $stmt->bind_param("issdsssis", $data['vendor_id'], $data['type'], $data['description'], $data['amount'], $new_balance, $entry_date, $method, $ledger_entry_id, $ledger_entry_model);
            $stmt->execute();
            $new_id = $stmt->insert_id;
            $stmt->close();

            if (!$new_id) throw new Exception("Failed to create vendor transaction record.");

            $this->conn->commit();
            return $new_id;
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    public function findTransactionById($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = ? LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $stmt->close();
        return ($result->num_rows > 0) ? $result->fetch_assoc() : null;
    }

    public function getAllTransactions($options) {
        $base_query = " FROM " . $this->table_name . " WHERE status = 'active'";
        $params = [];
        $types = "";

        if (!empty($options['vendor_id'])) {
            $base_query .= " AND vendor_id = ?";
            $params[] = $options['vendor_id'];
            $types .= "i";
        }
        // Add other filters as needed...

        // Get total count
        $count_query = "SELECT count(*) as total" . $base_query;
        $stmt_count = $this->conn->prepare($count_query);
        if (!empty($params)) $stmt_count->bind_param($types, ...$params);
        $stmt_count->execute();
        $total = $stmt_count->get_result()->fetch_assoc()['total'];
        $stmt_count->close();

        // Get paginated data
        $data_query = "SELECT * " . $base_query . " ORDER BY entry_date DESC, id DESC LIMIT ? OFFSET ?";
        $params[] = $options['limit'];
        $params[] = $options['offset'];
        $types .= "ii";
        $stmt_data = $this->conn->prepare($data_query);
        $stmt_data->bind_param($types, ...$params);
        $stmt_data->execute();
        $transactions = $stmt_data->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_data->close();

        return ['total' => $total, 'transactions' => $transactions];
    }
    /**
 * Updates the description of a specific vendor transaction.
 * @param int $id The ID of the transaction to update.
 * @param string $description The new description text.
 * @return bool True on success, false otherwise.
 */
public function updateTransaction($id, $description) {
    $query = "UPDATE " . $this->table_name . " SET description = ? WHERE id = ? AND status = 'active'";

    $stmt = $this->conn->prepare($query);
    $stmt->bind_param("si", $description, $id);

    if ($stmt->execute()) {
        return $stmt->affected_rows > 0;
    }
    return false;
}
/**
 * Soft deletes a vendor transaction. If it's a payment, it also creates
 * a reversal entry in the corresponding cash/bank ledger and recalculates
 * all subsequent balances for the vendor.
 * @param int $id The ID of the transaction to delete.
 * @return bool True on success, false on failure.
 */
public function deleteTransaction($id) {
    $this->conn->begin_transaction();
    try {
        $txn_to_delete = $this->findTransactionById($id);
        if (!$txn_to_delete || $txn_to_delete['status'] === 'deleted') {
            $this->conn->rollback(); return false;
        }

        // 1. If it was a Payment, reverse the ledger entry
        if ($txn_to_delete['type'] === 'Payment' && $txn_to_delete['ledger_entry_id']) {
            if ($txn_to_delete['ledger_entry_model'] === 'CashRegister') {
                $cash_model = new CashRegister($this->conn);
                $cash_model->deleteEntry($txn_to_delete['ledger_entry_id']);
            } else {
                $bank_model = new BankTransaction($this->conn);
                $bank_model->deleteTransaction($txn_to_delete['ledger_entry_id']);
            }
        }

        // 2. Soft-delete the vendor transaction
        $delete_query = "UPDATE " . $this->table_name . " SET status = 'deleted' WHERE id = ?";
        $stmt_del = $this->conn->prepare($delete_query);
        $stmt_del->bind_param("i", $id);
        $stmt_del->execute();
        $stmt_del->close();

        // 3. Recalculate subsequent balances for this vendor
        $vendor_id = $txn_to_delete['vendor_id'];
        $vendor_query = "SELECT opening_balance FROM vendors WHERE id = ?";
        $stmt_v = $this->conn->prepare($vendor_query);
        $stmt_v->bind_param("i", $vendor_id);
        $stmt_v->execute();
        $vendor = $stmt_v->get_result()->fetch_assoc();
        $stmt_v->close();

        $prev_query = "SELECT balance FROM " . $this->table_name . " WHERE vendor_id = ? AND (entry_date < ? OR (entry_date = ? AND id < ?)) AND status = 'active' ORDER BY entry_date DESC, id DESC LIMIT 1";
        $stmt_prev = $this->conn->prepare($prev_query);
        $stmt_prev->bind_param("issi", $vendor_id, $txn_to_delete['entry_date'], $txn_to_delete['entry_date'], $id);
        $stmt_prev->execute();
        $result_prev = $stmt_prev->get_result();
        $running_balance = ($result_prev->num_rows > 0) ? $result_prev->fetch_assoc()['balance'] : $vendor['opening_balance'];
        $stmt_prev->close();

        $subsequent_query = "SELECT id, type, amount FROM " . $this->table_name . " WHERE vendor_id = ? AND (entry_date > ? OR (entry_date = ? AND id > ?)) AND status = 'active' ORDER BY entry_date ASC, id ASC";
        $stmt_sub = $this->conn->prepare($subsequent_query);
        $stmt_sub->bind_param("issi", $vendor_id, $txn_to_delete['entry_date'], $txn_to_delete['entry_date'], $id);
        $stmt_sub->execute();
        $subsequent_entries = $stmt_sub->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_sub->close();

        $update_balance_query = "UPDATE " . $this->table_name . " SET balance = ? WHERE id = ?";
        $stmt_update = $this->conn->prepare($update_balance_query);
        foreach ($subsequent_entries as $entry) {
            $running_balance = ($entry['type'] === 'Purchase') ? $running_balance + $entry['amount'] : $running_balance - $entry['amount'];
            $stmt_update->bind_param("di", $running_balance, $entry['id']);
            $stmt_update->execute();
        }
        $stmt_update->close();

        $this->conn->commit();
        return true;
    } catch (Exception $e) {
        $this->conn->rollback();
        throw $e;
    }
}
}
?>