<?php
// FILE: ...\php-backend\src\Models\Vendor.php

class Vendor {
    private $conn;
    private $table_name = "vendors";

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Creates a new vendor record in the database.
     * @param array $data Associative array of vendor data.
     * @return int|false The ID of the newly created vendor, or false on failure.
     */
    public function createVendor($data) {
        $query = "INSERT INTO " . $this->table_name . " 
                    (name, phone, email, address, opening_balance) 
                  VALUES (?, ?, ?, ?, ?)";

        $stmt = $this->conn->prepare($query);

        $stmt->bind_param("ssssd", 
            $data['name'],
            $data['phone'],
            $data['email'],
            $data['address'],
            $data['opening_balance']
        );

        if ($stmt->execute()) {
            return $stmt->insert_id;
        }

        return false;
    }

    /**
     * Finds a vendor by their unique ID.
     * @param int $id The vendor's ID.
     * @return array|null The vendor data if found, otherwise null.
     */
    public function findVendorById($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = ? AND status = 'active' LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            return $result->fetch_assoc();
        }
        return null;
    }
    /**
 * Fetches a paginated list of vendors with an optional search filter.
 * @param array $options Contains filters (search) and pagination (limit, offset).
 * @return array An array containing the list of vendors and the total count.
 */
public function getAllVendors($options) {
    // Base query to select active vendors
    $base_query = " FROM " . $this->table_name . " WHERE status = 'active'";

    $where_clause = "";
    $params = [];
    $types = "";

    // Dynamically build the WHERE clause for search
    if (!empty($options['search'])) {
        $where_clause .= " AND (name LIKE ? OR email LIKE ?)";
        $search_term = "%" . $options['search'] . "%";
        array_push($params, $search_term, $search_term);
        $types .= "ss";
    }

    // --- First Query: Get the total count for pagination ---
    $count_query = "SELECT count(*) as total" . $base_query . $where_clause;
    $stmt_count = $this->conn->prepare($count_query);
    if ($types) {
        $stmt_count->bind_param($types, ...$params);
    }
    $stmt_count->execute();
    $total = $stmt_count->get_result()->fetch_assoc()['total'];
    $stmt_count->close();

    // --- Second Query: Get the paginated data ---
    $data_query = "SELECT *" . $base_query . $where_clause . " ORDER BY created_at DESC LIMIT ? OFFSET ?";

    // Add limit and offset to parameters
    array_push($params, $options['limit'], $options['offset']);
    $types .= "ii";

    $stmt_data = $this->conn->prepare($data_query);
    $stmt_data->bind_param($types, ...$params);
    $stmt_data->execute();
    $result = $stmt_data->get_result();
    $vendors = $result->fetch_all(MYSQLI_ASSOC);
    $stmt_data->close();

    return ['total' => $total, 'vendors' => $vendors];
}
/**
 * Updates a vendor record with the given data.
 * Dynamically builds the query to only update provided fields.
 * @param int $id The ID of the vendor to update.
 * @param array $data An associative array of flat, snake_case fields to update.
 * @return bool True on success, false on failure.
 */
public function updateVendor($id, $data) {
    if (empty($data)) {
        return true; // Nothing to update, return success.
    }

    $query_parts = [];
    $params = [];
    $types = "";

    // Dynamically build the SET part of the query
    foreach ($data as $key => $value) {
        $query_parts[] = "`$key` = ?";
        $params[] = $value;

        // Determine the type for bind_param
        if (is_int($value)) {
            $types .= "i";
        } elseif (is_double($value) || is_float($value)) {
            $types .= "d";
        } else {
            $types .= "s";
        }
    }

    // Add the vendor ID to the parameters for the WHERE clause
    $params[] = $id;
    $types .= "i";

    $query = "UPDATE " . $this->table_name . " SET " . implode(", ", $query_parts) . " WHERE id = ?";

    $stmt = $this->conn->prepare($query);
    // Use array splatting (...) to pass parameters to bind_param
    $stmt->bind_param($types, ...$params);

    return $stmt->execute();
}
/**
 * Soft deletes a vendor by setting their status to 'deleted'.
 * Corresponds to `Vendor.findByIdAndUpdate(id, { status: 'deleted' })`.
 * @param int $id The ID of the vendor to delete.
 * @return bool True if a record was updated, false otherwise.
 */
public function softDeleteVendor($id) {
    $query = "UPDATE " . $this->table_name . " SET status = 'deleted' WHERE id = ?";

    $stmt = $this->conn->prepare($query);
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        // Check if any row was actually affected/updated
        return $stmt->affected_rows > 0;
    }
    return false;
}
}
?>