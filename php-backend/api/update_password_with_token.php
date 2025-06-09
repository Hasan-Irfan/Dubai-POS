<?php
// FILE: ...\php-backend\api\update_password_with_token.php

// --- Headers ---
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

// --- Dependencies ---
require_once '../vendor/autoload.php';
require_once '../config/database.php';
require_once '../config/jwt_config.php';
require_once '../src/Models/User.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;

// --- Logic ---
$data = json_decode(file_get_contents("php://input"));
$resetToken = $data->resetToken ?? null;
$password = $data->password ?? null;

if (!$resetToken || !$password) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Reset token and new password are required.']);
    exit();
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters long.']);
    exit();
}

try {
    // 1. Verify the JWT reset token
    $decoded = JWT::decode($resetToken, new Key(RESET_TOKEN_SECRET, 'HS256'));
    $user_id = $decoded->_id;

    // 2. Update the user's password
    $conn = connectDB();
    $user_model = new User($conn);
    
    if ($user_model->updatePassword($user_id, $password)) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Password has been updated successfully. Please log in.'
        ]);
    } else {
        throw new Exception("Failed to update password for user ID: $user_id");
    }

} catch (ExpiredException $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Your password reset link has expired. Please request a new one.']);
} catch (Exception $e) {
    // Catches other JWT errors (invalid signature, etc.) or DB errors
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid reset link. Please request a new one.']);
}
?>
