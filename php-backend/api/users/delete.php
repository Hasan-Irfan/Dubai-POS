<?php
// FILE: ...\php-backend\api\users\delete.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/User.php';

$user_data = verify_jwt_and_get_user();
// IMPORTANT: Only 'superAdmin' can delete users, as per the original route definition.
if ($user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden: Only a Super Admin can delete users.']);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$user_id_to_delete = $data['id'] ?? null;

if (!$user_id_to_delete) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'User ID is required.']);
    exit();
}

// Prevent a user from deleting themselves
if ($user_id_to_delete == $user_data['id']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'You cannot delete your own account.']);
    exit();
}

try {
    $conn = connectDB();
    $user_model = new User($conn);

    if ($user_model->deleteUser($user_id_to_delete)) {
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    } else {
        throw new Exception('Failed to delete user or user not found.');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>