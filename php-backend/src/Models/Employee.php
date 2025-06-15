<?php
// FILE: ...\php-backend\src\Models\Employee.php

class Employee {
    private $conn;
    private $table_name = "employees";

    public function __construct($db) {
        $this->conn = $db;
    }
    /**
 * Fetches a paginated list of employees with optional filters.
 * Corresponds to `getAllEmployees` service function.
 * @param array $options Contains filters (role, search) and pagination (limit, offset).
 * @return array An array containing the list of employees and the total count.
 */
public function getAllEmployees($options) {
    $base_query = " FROM " . $this->table_name . " WHERE status = 'active'";
    $params = [];
    $types = "";

    // Build WHERE clause dynamically
    $where_clause = "";
    if (!empty($options['role'])) {
        $where_clause .= " AND role = ?";
        $params[] = $options['role'];
        $types .= "s";
    }
    if (!empty($options['search'])) {
        $where_clause .= " AND (name LIKE ? OR email LIKE ?)";
        $search_term = "%" . $options['search'] . "%";
        $params[] = $search_term;
        $params[] = $search_term;
        $types .= "ss";
    }

    $count_query = "SELECT count(*) as total" . $base_query . $where_clause;
    $stmt_count = $this->conn->prepare($count_query);
    if ($types) {
        $stmt_count->bind_param($types, ...$params);
    }
    $stmt_count->execute();
    $total = $stmt_count->get_result()->fetch_assoc()['total'];

    // Get the paginated data
    $data_query = "SELECT *" . $base_query . $where_clause . " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    $params[] = $options['limit'];
    $params[] = $options['offset'];
    $types .= "ii";

    $stmt_data = $this->conn->prepare($data_query);
    $stmt_data->bind_param($types, ...$params);
    $stmt_data->execute();
    $result = $stmt_data->get_result();
    $employees = $result->fetch_all(MYSQLI_ASSOC);

    return ['total' => $total, 'employees' => $employees];
}
/**
 * Updates the salary balance for a given employee.
 * @param int $employeeId The employee's ID.
 * @param float $amount The amount to add to or subtract from the balance.
 * @return bool True on success, false otherwise.
 */
public function updateSalaryBalance($employeeId, $amount) {
    $query = "UPDATE " . $this->table_name . " SET salary_balance = salary_balance + ? WHERE id = ?";
    $stmt = $this->conn->prepare($query);
    $stmt->bind_param("di", $amount, $employeeId);
    return $stmt->execute();
}

/**
 * Deletes an employee record from the database.
 * Corresponds to `Employee.findByIdAndDelete(id)`.
 * @param int $id The ID of the employee to delete.
 * @return bool True if a record was deleted, false otherwise.
 */
public function deleteEmployee($id) {
    $query = "DELETE FROM " . $this->table_name . " WHERE id = ?";

    $stmt = $this->conn->prepare($query);
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        // Check if any row was actually affected
        if ($stmt->affected_rows > 0) {
            return true;
        }
    }
    return false;
}
    /**
 * Updates an employee record with the given data.
 * Dynamically builds the query to only update provided fields.
 * @param int $id The ID of the employee to update.
 * @param array $data An associative array of fields to update.
 * @return bool True on success, false on failure.
 */
public function updateEmployee($id, $data) {
    if (empty($data)) {
        return true; // Nothing to update
    }

    $query_parts = [];
    $params = [];
    $types = "";

    // Dynamically build the SET part of the query
    foreach ($data as $key => $value) {
        $query_parts[] = "`$key` = ?";
        $params[] = &$data[$key]; // Pass by reference for bind_param

        // Determine the type for bind_param
        if (is_int($value)) {
            $types .= "i";
        } elseif (is_double($value) || is_float($value)) {
            $types .= "d";
        } else {
            $types .= "s";
        }
    }

    // Add the employee ID to the parameters for the WHERE clause
    $params[] = &$id;
    $types .= "i";

    $query = "UPDATE " . $this->table_name . " SET " . implode(", ", $query_parts) . " WHERE id = ?";

    $stmt = $this->conn->prepare($query);
    $stmt->bind_param($types, ...$params);

    return $stmt->execute();
    }

    /**
     * Creates a new employee record in the database.
     * Corresponds to the `addEmployee` function in `employeeService.js`.
     * @param array $data Associative array of employee data.
     * @return int|false The ID of the newly created employee, or false on failure.
     */
    public function createEmployee($data) {
        if (!isset($data['salary_net'])) {
            $data['salary_net'] = $data['salary_gross'];
        }

        // --- FIX: Initialize salary_balance along with salary ---
        $query = "INSERT INTO " . $this->table_name . " 
                    (name, phone, email, address, role, hire_date, salary_gross, salary_net, salary_balance) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->conn->prepare($query);

        $initial_salary = $data['salary_gross']; // Balance starts at the gross amount

        $stmt->bind_param("ssssssddd", 
            $data['name'],
            $data['phone'],
            $data['email'],
            $data['address'],
            $data['role'],
            $data['hire_date'],
            $data['salary_gross'],
            $data['salary_net'],
            $initial_salary // Set the starting balance
        );

        if ($stmt->execute()) {
            return $stmt->insert_id;
        }
        
        return false;
    }

     /**
     * Finds an employee by their unique ID.
     * @param int $id The employee's ID.
     * @return array|null The employee data if found, otherwise null.
     */
    public function findEmployeeById($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = ? LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            return $result->fetch_assoc();
        }
        return null;
    }
}
?>