<?php
// FILE: ...\php-backend\src\Models\BankTransaction.php

class BankTransaction {
    private $conn;
    private $table_name = "bank_transactions";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function recordTransaction($data) {
        $this->conn->begin_transaction();
        try {
            $entry_date = $data['date'] ?? date('Y-m-d H:i:s');

            // --- FIX: Opening Balance Check ---
            if ($data['type'] !== 'Opening') {
                $opening_check_query = "SELECT id FROM " . $this->table_name . " WHERE type = 'Opening' AND status = 'active' LIMIT 1";
                $opening_check_result = $this->conn->query($opening_check_query);
                if ($opening_check_result->num_rows === 0) {
                    throw new Exception('An opening balance must be created before any other bank transactions.');
                }
            } else { // It IS an 'Opening' type, so check for duplicates
                $opening_check_query = "SELECT id FROM " . $this->table_name . " WHERE type = 'Opening' AND status = 'active' LIMIT 1";
                $opening_check_result = $this->conn->query($opening_check_query);
                if ($opening_check_result->num_rows > 0) {
                    throw new Exception('An opening balance entry already exists. Only one is allowed.');
                }
            }

            // --- Find previous balance based on date ---
            $last_entry_query = "SELECT balance FROM " . $this->table_name . " WHERE (entry_date < ? OR (entry_date = ? AND id < 0)) AND status = 'active' ORDER BY entry_date DESC, id DESC LIMIT 1";
            $stmt_prev = $this->conn->prepare($last_entry_query);
            $stmt_prev->bind_param("ss", $entry_date, $entry_date);
            $stmt_prev->execute();
            $result = $stmt_prev->get_result();
            $last_balance = ($result->num_rows > 0) ? $result->fetch_assoc()['balance'] : 0;
            $stmt_prev->close();

            $new_balance = $last_balance;
            if ($data['type'] === 'Inflow') {
                $new_balance += $data['amount'];
            } elseif ($data['type'] === 'Outflow') {
                $new_balance -= $data['amount'];
            } else { // 'Opening'
                $new_balance = $data['amount'];
            }

            $insert_query = "INSERT INTO " . $this->table_name . " (entry_date, type, method, reference, amount, balance) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $this->conn->prepare($insert_query);
            $stmt->bind_param("ssssdd", $entry_date, $data['type'], $data['method'], $data['reference'], $data['amount'], $new_balance);
            $stmt->execute();
            $new_id = $stmt->insert_id;
            $stmt->close();

            if (!$new_id) {
                throw new Exception("Failed to create bank transaction.");
            }
            
            // --- FIX: Recalculate all subsequent balances ---
            $this->recalculateBalancesFromDate($entry_date);

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

        if (!empty($options['method'])) {
            $base_query .= " AND method = ?";
            $params[] = $options['method'];
            $types .= "s";
        }
        if (!empty($options['from'])) {
            $base_query .= " AND entry_date >= ?";
            $params[] = $options['from'];
            $types .= "s";
        }
        if (!empty($options['to'])) {
            $base_query .= " AND entry_date <= ?";
            $params[] = $options['to'];
            $types .= "s";
        }

        $count_query = "SELECT count(*) as total" . $base_query;
        $stmt_count = $this->conn->prepare($count_query);
        if (!empty($params)) $stmt_count->bind_param($types, ...$params);
        $stmt_count->execute();
        $total = $stmt_count->get_result()->fetch_assoc()['total'];
        $stmt_count->close();

        $data_query = "SELECT *" . $base_query . " ORDER BY entry_date DESC, id DESC LIMIT ? OFFSET ?";
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

    public function updateTransaction($id, $reference) {
        $query = "UPDATE " . $this->table_name . " SET reference = ? WHERE id = ? AND status = 'active'";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("si", $reference, $id);
        if ($stmt->execute()) {
            return $stmt->affected_rows > 0;
        }
        return false;
    }

    public function deleteTransaction($id) {
        $this->conn->begin_transaction();
        try {
            $txn_to_delete = $this->findTransactionById($id);
            if (!$txn_to_delete || $txn_to_delete['status'] === 'deleted') {
                $this->conn->rollback();
                return false;
            }

            $delete_query = "UPDATE " . $this->table_name . " SET status = 'deleted' WHERE id = ?";
            $stmt_del = $this->conn->prepare($delete_query);
            $stmt_del->bind_param("i", $id);
            $stmt_del->execute();
            $stmt_del->close();

            $prev_query = "SELECT balance FROM " . $this->table_name . " WHERE (entry_date < ? OR (entry_date = ? AND id < ?)) AND status = 'active' ORDER BY entry_date DESC, id DESC LIMIT 1";
            $stmt_prev = $this->conn->prepare($prev_query);
            $stmt_prev->bind_param("ssi", $txn_to_delete['entry_date'], $txn_to_delete['entry_date'], $id);
            $stmt_prev->execute();
            $result_prev = $stmt_prev->get_result();
            $running_balance = ($result_prev->num_rows > 0) ? $result_prev->fetch_assoc()['balance'] : 0;
            $stmt_prev->close();

            $subsequent_query = "SELECT id, type, amount FROM " . $this->table_name . " WHERE (entry_date > ? OR (entry_date = ? AND id > ?)) AND status = 'active' ORDER BY entry_date ASC, id ASC";
            $stmt_sub = $this->conn->prepare($subsequent_query);
            $stmt_sub->bind_param("ssi", $txn_to_delete['entry_date'], $txn_to_delete['entry_date'], $id);
            $stmt_sub->execute();
            $subsequent_entries = $stmt_sub->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt_sub->close();

            $update_balance_query = "UPDATE " . $this->table_name . " SET balance = ? WHERE id = ?";
            $stmt_update = $this->conn->prepare($update_balance_query);
            foreach ($subsequent_entries as $entry) {
                if ($entry['type'] === 'Inflow') {
                    $running_balance += $entry['amount'];
                } elseif ($entry['type'] === 'Outflow') {
                    $running_balance -= $entry['amount'];
                }
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
    /**
     * Recalculates all running balances from a specific date forward.
     * @param string $startDate The date (YYYY-MM-DD HH:MM:SS) from which to start recalculating.
     * @return bool True on success.
     * @throws Exception on failure.
     */
    public function recalculateBalancesFromDate($startDate) {
        // 1. Find the last entry BEFORE the start date to get a starting balance.
        $prev_query = "SELECT balance FROM " . $this->table_name . " WHERE entry_date < ? AND status = 'active' ORDER BY entry_date DESC, id DESC LIMIT 1";
        $stmt_prev = $this->conn->prepare($prev_query);
        $stmt_prev->bind_param("s", $startDate);
        $stmt_prev->execute();
        $result_prev = $stmt_prev->get_result();
        $running_balance = ($result_prev->num_rows > 0) ? $result_prev->fetch_assoc()['balance'] : 0;
        $stmt_prev->close();

        // 2. Get all subsequent active entries that need recalculating.
        $subsequent_query = "SELECT id, type, amount FROM " . $this->table_name . " WHERE entry_date >= ? AND status = 'active' ORDER BY entry_date ASC, id ASC";
        $stmt_sub = $this->conn->prepare($subsequent_query);
        $stmt_sub->bind_param("s", $startDate);
        $stmt_sub->execute();
        $subsequent_entries = $stmt_sub->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_sub->close();

        // 3. Loop through and update balances.
        $update_balance_query = "UPDATE " . $this->table_name . " SET balance = ? WHERE id = ?";
        $stmt_update = $this->conn->prepare($update_balance_query);
        foreach ($subsequent_entries as $entry) {
            if ($entry['type'] === 'Opening') {
                $running_balance = $entry['amount'];
            } elseif ($entry['type'] === 'Inflow') {
                $running_balance += $entry['amount'];
            } elseif ($entry['type'] === 'Outflow') {
                $running_balance -= $entry['amount'];
            }
            $stmt_update->bind_param("di", $running_balance, $entry['id']);
            $stmt_update->execute();
        }
        $stmt_update->close();

        return true;
    }
}
?>