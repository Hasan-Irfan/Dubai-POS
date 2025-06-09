<?php
// FILE: C:\xampp\htdocs\dubai-pos-backend\src\Models\User.php

class User {
    private $conn;
    private $table_name = "users";

    public function __construct($db) {
        $this->conn = $db;
    }


    /**
     * Updates the password for a given user.
     * Corresponds to finding the user, hashing the new password, and saving.
     * @param int $id The user's ID.
     * @param string $new_password The new plain-text password.
     * @return bool True on success, false on failure.
     */
    public function updatePassword($id, $new_password) {
        // Hash the new password securely
        $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);

        $query = "UPDATE " . $this->table_name . " SET password = ? WHERE id = ?";

        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("si", $hashed_password, $id);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    /**
 * Finds a user by their unique ID.
 * Corresponds to `User.findById(id)`
 * @param int $id The user's ID.
 * @return array|null The user data if found, otherwise null.
 */
    public function findUserById($id) {
        $query = "SELECT id, username, email, role FROM " . $this->table_name . " WHERE id = ? LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $id); // 'i' for integer
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            return $result->fetch_assoc();
        }
        return null;
    }
        /**
     * Fetches a paginated and filtered list of users.
     * @param array $options Contains filters (role, username) and pagination.
     * @return array An array containing the list of users and the total count.
     */
    public function getAllUsers($options) {
        $base_query = " FROM " . $this->table_name;
        $where_clause = " WHERE 1=1";
        $params = [];
        $types = "";

        if (!empty($options['role'])) {
            $where_clause .= " AND role = ?";
            $params[] = $options['role'];
            $types .= "s";
        }
        if (!empty($options['username'])) {
            $where_clause .= " AND username LIKE ?";
            $username_search = "%" . $options['username'] . "%";
            $params[] = $username_search;
            $types .= "s";
        }

        // Get total count
        $count_query = "SELECT count(*) as total" . $base_query . $where_clause;
        $stmt_count = $this->conn->prepare($count_query);
        if (!empty($params)) $stmt_count->bind_param($types, ...$params);
        $stmt_count->execute();
        $total = $stmt_count->get_result()->fetch_assoc()['total'];
        $stmt_count->close();

        // Get paginated data
        $data_query = "SELECT id, username, email, role, created_at, updated_at" . $base_query . $where_clause . " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $params[] = $options['limit'];
        $params[] = $options['offset'];
        $types .= "ii";
        $stmt_data = $this->conn->prepare($data_query);
        $stmt_data->bind_param($types, ...$params);
        $stmt_data->execute();
        $users = $stmt_data->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_data->close();

        return ['total' => $total, 'users' => $users];
    }

    /**
     * Updates a user's details (username, email, role).
     * @param int $id The ID of the user to update.
     * @param array $data The data to update.
     * @return bool True on success, false otherwise.
     */
    public function updateUser($id, $data) {
        if (empty($data)) return true;

        $query_parts = [];
        $params = [];
        $types = "";
        foreach ($data as $key => $value) {
            $query_parts[] = "`$key` = ?";
            $params[] = $value;
            $types .= "s";
        }
        $params[] = $id;
        $types .= "i";

        $query = "UPDATE " . $this->table_name . " SET " . implode(", ", $query_parts) . " WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param($types, ...$params);
        return $stmt->execute();
    }

    /**
     * Deletes a user from the database.
     * @param int $id The ID of the user to delete.
     * @return bool True if a record was deleted, false otherwise.
     */
    public function deleteUser($id) {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            return $stmt->affected_rows > 0;
        }
        return false;
    }

    /**
     * Finds a user by their email or username.
     * Corresponds to `User.findOne({ $or: [{ username }, { email }] });` 
     * @param string $username
     * @param string $email
     * @return array|null The user data if found, otherwise null.
     */

    public function updateRefreshToken($id, $token) {
        $query = "UPDATE " . $this->table_name . " SET refreshToken = ? WHERE id = ?";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("si", $token, $id);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }
    public function findUserByEmailOrUsername($username, $email) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE username = ? OR email = ? LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("ss", $username, $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            return $result->fetch_assoc();
        }
        return null;
    }

    /**
     * Creates a new user in the database.
     * Corresponds to `const newUser = new User(...)` and `await newUser.save()` 
     * @param string $username
     * @param string $email
     * @param string $password The plain-text password to be hashed.
     * @param string $role
     * @return bool True on success, false on failure.
     */
     public function createUser($username, $email, $password, $role = 'admin') {
        // ... (hashing logic remains the same) ...

        $query = "INSERT INTO " . $this->table_name . " (username, email, password, role) VALUES (?, ?, ?, ?)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("ssss", $username, $email, $hashed_password, $role);
        
        if ($stmt->execute()) {
            // Change this line to return the new ID
            return $stmt->insert_id; 
        }
        // Change this line to return false
        return false;
    }
}
?>