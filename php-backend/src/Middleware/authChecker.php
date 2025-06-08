<?php
// FILE: ...php-backend\src\Middleware\authChecker.php

// This script replaces the jwtVerify middleware from authChecker.js

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/jwt_config.php'; 
require_once __DIR__ . '/../../src/Models/User.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Verifies the user's JWT. On failure, it sends a 401 response and terminates the script.
 * On success, it returns the authenticated user's data.
 * @return array The user's data (id, username, email, role).
 */
function verify_jwt_and_get_user() {
    // 1. Get token from cookie or Authorization header 
    $token = $_COOKIE['accessToken'] ?? null;
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;

    if (!$token && $authHeader && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
    }

    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized Request: No token provided']);
        exit();
    }

    // 2. Try to decode the token
    try {
        $decoded = JWT::decode($token, new Key(ACCESS_TOKEN_SECRET, 'HS256'));

        if (!isset($decoded->_id)) {
            throw new Exception('Invalid token structure');
        }

        // 3. Find the user in the database
        $conn = connectDB();
        $user_model = new User($conn);
        $user = $user_model->findUserById($decoded->_id);

        if (!$user) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid Access Token: User not found']);
            exit();
        }

        // 4. Return the user data on success
        return $user;

    } catch (Exception $e) {
        // Catches expired tokens, invalid signatures, etc.
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid or Expired Access Token: ' . $e->getMessage()]);
        exit();
    }
}
?>