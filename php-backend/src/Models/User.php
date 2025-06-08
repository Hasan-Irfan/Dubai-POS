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