<?php
// FILE: ...\php-backend\src\Models\CashRegister.php

class CashRegister {
    private $conn;
    private $table_name = "cash_register";

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Records a new cash entry and calculates the running balance.
     * @param array $data Associative array of cash entry data.
     * @return int|false The ID of the new entry, or false on failure.
     */
    public function recordCashEntry($data) {
        $this->conn->begin_transaction();

        try {
            // 1. Get the last active entry to determine the previous balance.
            $last_entry_query = "SELECT balance FROM " . $this->table_name . " WHERE status = 'active' ORDER BY entry_date DESC, id DESC LIMIT 1";
            $last_entry_stmt = $this->conn->prepare($last_entry_query);
            $last_entry_stmt->execute();
            $result = $last_entry_stmt->get_result();
            $last_balance = ($result->num_rows > 0) ? $result->fetch_assoc()['balance'] : 0;
            $last_entry_stmt->close();

            // 2. Calculate the new balance.
            $new_balance = $last_balance;
            if ($data['type'] === 'Inflow') {
                $new_balance += $data['amount'];
            } elseif ($data['type'] === 'Outflow') {
                $new_balance -= $data['amount'];
            } else { // 'Opening'
                $new_balance = $data['amount'];
            }

            // 3. Insert the new cash entry.
            $insert_query = "INSERT INTO " . $this->table_name . " (entry_date, type, reference, amount, balance) VALUES (?, ?, ?, ?, ?)";
            $stmt = $this->conn->prepare($insert_query);
            $entry_date = $data['date'] ?? date('Y-m-d H:i:s');
            $stmt->bind_param("sssdd", $entry_date, $data['type'], $data['reference'], $data['amount'], $new_balance);

            $stmt->execute();
            $new_id = $stmt->insert_id;
            $stmt->close();

            if (!$new_id) {
                throw new Exception("Failed to create cash entry.");
            }

            $this->conn->commit();
            return $new_id;

        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    /**
     * Finds a cash entry by its unique ID.
     * @param int $id The entry's ID.
     * @return array|null The entry data if found, otherwise null.
     */
    public function findEntryById($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = ? LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $stmt->close();
        return ($result->num_rows > 0) ? $result->fetch_assoc() : null;
    }
    /**
 * Fetches a paginated and filtered list of cash entries.
 * @param array $options Contains filters (type, from, to) and pagination (limit, offset).
 * @return array An array containing the list of entries and the total count.
 */
public function getAllEntries($options) {
    $base_query = " FROM " . $this->table_name . " WHERE status = 'active'";
    $params = [];
    $types = "";

    // Build WHERE clause dynamically
    if (!empty($options['type'])) {
        $base_query .= " AND type = ?";
        $params[] = $options['type'];
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

    // First Query: Get the total count for pagination
    $count_query = "SELECT count(*) as total" . $base_query;
    $stmt_count = $this->conn->prepare($count_query);
    if (!empty($params)) {
        $stmt_count->bind_param($types, ...$params);
    }
    $stmt_count->execute();
    $total = $stmt_count->get_result()->fetch_assoc()['total'];
    $stmt_count->close();

    // Second Query: Get the paginated data, sorted with newest first
    $data_query = "SELECT *" . $base_query . " ORDER BY entry_date DESC, id DESC LIMIT ? OFFSET ?";
    $params[] = $options['limit'];
    $params[] = $options['offset'];
    $types .= "ii";

    $stmt_data = $this->conn->prepare($data_query);
    $stmt_data->bind_param($types, ...$params);
    $stmt_data->execute();
    $entries = $stmt_data->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_data->close();

    return ['total' => $total, 'entries' => $entries];
}
/**
 * Updates the reference field of a specific cash entry.
 * @param int $id The ID of the entry to update.
 * @param string $reference The new reference text.
 * @return bool True on success, false otherwise.
 */
public function updateEntry($id, $reference) {
    $query = "UPDATE " . $this->table_name . " SET reference = ? WHERE id = ? AND status = 'active'";

    $stmt = $this->conn->prepare($query);
    $stmt->bind_param("si", $reference, $id);

    if ($stmt->execute()) {
        return $stmt->affected_rows > 0;
    }
    return false;
}
/**
 * Soft deletes a cash entry and recalculates all subsequent balances.
 * @param int $id The ID of the entry to delete.
 * @return bool True on success, false on failure.
 */
public function deleteEntry($id) {
    $this->conn->begin_transaction();
    try {
        // 1. Get the entry to be deleted to know its date and amount.
        $entry_to_delete = $this->findEntryById($id);
        if (!$entry_to_delete || $entry_to_delete['status'] === 'deleted') {
            $this->conn->rollback();
            return false; // Entry not found or already deleted
        }

        // 2. Soft-delete the entry.
        $delete_query = "UPDATE " . $this->table_name . " SET status = 'deleted' WHERE id = ?";
        $stmt_del = $this->conn->prepare($delete_query);
        $stmt_del->bind_param("i", $id);
        $stmt_del->execute();
        $stmt_del->close();

        // 3. Find the last entry before the one we deleted to get a starting balance.
        $prev_query = "SELECT balance FROM " . $this->table_name . " WHERE (entry_date < ? OR (entry_date = ? AND id < ?)) AND status = 'active' ORDER BY entry_date DESC, id DESC LIMIT 1";
        $stmt_prev = $this->conn->prepare($prev_query);
        $stmt_prev->bind_param("ssi", $entry_to_delete['entry_date'], $entry_to_delete['entry_date'], $id);
        $stmt_prev->execute();
        $result_prev = $stmt_prev->get_result();
        $running_balance = ($result_prev->num_rows > 0) ? $result_prev->fetch_assoc()['balance'] : 0;
        $stmt_prev->close();

        // 4. Get all subsequent active entries that need recalculating.
        $subsequent_query = "SELECT id, type, amount FROM " . $this->table_name . " WHERE (entry_date > ? OR (entry_date = ? AND id > ?)) AND status = 'active' ORDER BY entry_date ASC, id ASC";
        $stmt_sub = $this->conn->prepare($subsequent_query);
        $stmt_sub->bind_param("ssi", $entry_to_delete['entry_date'], $entry_to_delete['entry_date'], $id);
        $stmt_sub->execute();
        $subsequent_entries = $stmt_sub->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_sub->close();

        // 5. Loop through and update balances.
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
}
?>