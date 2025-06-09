<?php
// FILE: ...\php-backend\api\users\update.php

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
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$user_id = $data['id'] ?? null;
$update_payload = $data['updateData'] ?? null;

if (!$user_id || !$update_payload) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'User ID and updateData are required.']);
    exit();
}

try {
    $conn = connectDB();
    $user_model = new User($conn);

    if ($user_model->updateUser($user_id, $update_payload)) {
        $updated_user = $user_model->findUserById($user_id);
        http_response_code(200);
        echo json_encode(['success' => true, 'user' => $updated_user]);
    } else {
        throw new Exception('Failed to update user or user not found.');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred during update: ' . $e->getMessage()]);
}
?>