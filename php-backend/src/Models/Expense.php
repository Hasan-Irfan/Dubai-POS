<?php
// FILE: ...\php-backend\src\Models\Expense.php

class Expense {
    private $conn;
    private $table_name = "expenses";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function recordExpense($data, $audit_context = []) {
        $this->conn->begin_transaction();
        try {
            // --- FIX: Opening Balance Check ---
            if ($data['payment_type'] === 'Cash') {
                $opening_check = $this->conn->query("SELECT id FROM cash_register WHERE type = 'Opening' AND status = 'active' LIMIT 1");
                if ($opening_check->num_rows === 0) {
                    throw new Exception('Cash opening balance is required before recording cash expenses.');
                }
            } else { // Bank or Shabka
                $opening_check = $this->conn->query("SELECT id FROM bank_transactions WHERE type = 'Opening' AND status = 'active' LIMIT 1");
                if ($opening_check->num_rows === 0) {
                    throw new Exception('Bank opening balance is required before recording bank/shabka expenses.');
                }
            }
            // --- End of FIX ---

            $ledger_entry_id = null;
            $ledger_entry_model = null;
            $reference = "Expense: " . ($data['description'] ?? 'N/A');

            if ($data['payment_type'] === 'Cash') {
                $cash_model = new CashRegister($this->conn);
                $ledger_entry_id = $cash_model->recordCashEntry($data); // Pass full data for date
                $ledger_entry_model = 'CashRegister';
            } else {
                $bank_model = new BankTransaction($this->conn);
                $ledger_entry_id = $bank_model->recordTransaction($data); // Pass full data for date
                $ledger_entry_model = 'BankTransaction';
            }

            if (!$ledger_entry_id) {
                throw new Exception("Failed to create ledger transaction for expense.");
            }

            // --- FIX: Add Audit Info ---
            $actor_id = $audit_context['actor_id'] ?? null;
            $actor_model = $audit_context['actor_model'] ?? null;
            // --- End of FIX ---

            $query = "INSERT INTO " . $this->table_name . " 
                        (entry_date, category, description, amount, payment_type, paid_to_id, paid_to_model, ledger_entry_id, ledger_entry_model, actor_id, actor_model) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->conn->prepare($query);
            $entry_date = $data['date'] ?? date('Y-m-d H:i:s');
            $stmt->bind_param("ssdsisiisii", 
                $entry_date, $data['category'], $data['description'], $data['amount'],
                $data['payment_type'], $data['paid_to_id'], $data['paid_to_model'],
                $ledger_entry_id, $ledger_entry_model, $actor_id, $actor_model
            );
            $stmt->execute();
            $new_id = $stmt->insert_id;
            $stmt->close();

            if (!$new_id) {
                throw new Exception("Failed to create expense record after ledger entry.");
            }

            $this->conn->commit();
            return $new_id;
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    public function findExpenseById($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = ? LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $stmt->close();
        return ($result->num_rows > 0) ? $result->fetch_assoc() : null;
    }
    

    public function getAllExpenses($options) {
        $base_query = " FROM " . $this->table_name . " WHERE status = 'active'";
        $params = [];
        $types = "";

        if (!empty($options['category'])) {
            $base_query .= " AND category = ?";
            $params[] = $options['category'];
            $types .= "s";
        }
        if (!empty($options['payment_type'])) {
            $base_query .= " AND payment_type = ?";
            $params[] = $options['payment_type'];
            $types .= "s";
        }
        if (!empty($options['search'])) {
            $base_query .= " AND description LIKE ?";
            $search_term = "%" . $options['search'] . "%";
            $params[] = $search_term;
            $types .= "s";
        }

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
        $expenses = $stmt_data->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_data->close();

        return ['total' => $total, 'expenses' => $expenses];
    }
    /**
     * Updates an expense record. If amount or payment type changes, it reverses the old
     * ledger entry and creates a new one to maintain financial integrity.
     * @param int $id The ID of the expense to update.
     * @param array $data The new data for the expense.
     * @return bool True on success, false on failure.
     */
    public function updateExpense($id, $data) {
        $this->conn->begin_transaction();
        try {
            // 1. Get the current state of the expense
            $current_expense = $this->findExpenseById($id);
            if (!$current_expense) {
                $this->conn->rollback();
                return false;
            }

            // 2. Determine if a financial transaction reversal/re-creation is needed
            $needs_ledger_update = isset($data['amount']) && $data['amount'] != $current_expense['amount'] ||
                                isset($data['payment_type']) && $data['payment_type'] != $current_expense['payment_type'];

            if ($needs_ledger_update) {
                // Reverse the original ledger entry
                if ($current_expense['ledger_entry_model'] === 'CashRegister') {
                    $cash_model = new CashRegister($this->conn);
                    $cash_model->deleteEntry($current_expense['ledger_entry_id']);
                } else {
                    $bank_model = new BankTransaction($this->conn);
                    $bank_model->deleteTransaction($current_expense['ledger_entry_id']);
                }

                // Create a new ledger entry with the updated details
                $new_payment_type = $data['payment_type'] ?? $current_expense['payment_type'];
                $new_amount = $data['amount'] ?? $current_expense['amount'];
                $new_description = $data['description'] ?? $current_expense['description'];
                $new_reference = "Expense: " . $new_description;
                $new_ledger_id = null;
                $new_ledger_model = null;

                if ($new_payment_type === 'Cash') {
                    $cash_model = new CashRegister($this->conn);
                    $new_ledger_id = $cash_model->recordCashEntry(['date' => date('Y-m-d H:i:s'), 'type' => 'Outflow', 'reference' => $new_reference, 'amount' => $new_amount]);
                    $new_ledger_model = 'CashRegister';
                } else {
                    $bank_model = new BankTransaction($this->conn);
                    $new_ledger_id = $bank_model->recordTransaction(['date' => date('Y-m-d H:i:s'), 'type' => 'Outflow', 'method' => $new_payment_type, 'reference' => $new_reference, 'amount' => $new_amount]);
                    $new_ledger_model = 'BankTransaction';
                }

                $data['ledger_entry_id'] = $new_ledger_id;
                $data['ledger_entry_model'] = $new_ledger_model;
            }

            // 3. Update the expense record itself
            $query_parts = [];
            $params = [];
            $types = "";
            foreach ($data as $key => $value) {
                $query_parts[] = "`$key` = ?";
                $params[] = $value;
                $types .= is_int($value) ? "i" : (is_float($value) ? "d" : "s");
            }
            $params[] = $id;
            $types .= "i";

            $update_query = "UPDATE " . $this->table_name . " SET " . implode(", ", $query_parts) . " WHERE id = ?";
            $stmt_update = $this->conn->prepare($update_query);
            $stmt_update->bind_param($types, ...$params);
            $stmt_update->execute();
            $stmt_update->close();

            $this->conn->commit();
            return true;

        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }
    public function deleteExpense($id) {
        $this->conn->begin_transaction();
        try {
            $expense = $this->findExpenseById($id);
            if (!$expense || $expense['status'] === 'deleted') {
                $this->conn->rollback();
                return false;
            }

            // Reverse the associated ledger entry
            if ($expense['ledger_entry_id']) {
                if ($expense['ledger_entry_model'] === 'CashRegister') {
                    $cash_model = new CashRegister($this->conn);
                    $cash_model->deleteEntry($expense['ledger_entry_id']);
                } else {
                    $bank_model = new BankTransaction($this->conn);
                    $bank_model->deleteTransaction($expense['ledger_entry_id']);
                }
            }

            // Soft delete the expense itself
            $query = "UPDATE " . $this->table_name . " SET status = 'deleted' WHERE id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $affected_rows = $stmt->affected_rows;
            $stmt->close();

            $this->conn->commit();
            return $affected_rows > 0;
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }
}
?>