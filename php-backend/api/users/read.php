<?php
// FILE: ...\php-backend\api\users\read.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

try {
    $conn = connectDB();
    $user_model = new User($conn);

    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $result = $user_model->getAllUsers([
        'role' => $_GET['role'] ?? null,
        'username' => $_GET['username'] ?? null,
        'limit' => $limit,
        'offset' => $offset
    ]);

    $response = [
        'success' => true,
        'users' => $result['users'],
        'total' => (int)$result['total'],
        'page' => $page,
        'limit' => $limit,
        'totalPages' => ceil($result['total'] / $limit),
    ];

    http_response_code(200);
    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>