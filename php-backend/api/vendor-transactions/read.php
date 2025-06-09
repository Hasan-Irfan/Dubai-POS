<?php
// FILE: ...\php-backend\api\vendor-transactions\read.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/VendorTransaction.php';
require_once '../../src/Utils/formatters.php';

$user_data = verify_jwt_and_get_user();
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

try {
    $conn = connectDB();
    $txn_model = new VendorTransaction($conn);

    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $result = $txn_model->getAllTransactions([
        'vendor_id' => $_GET['vendorId'] ?? null,
        'limit' => $limit,
        'offset' => $offset
    ]);

    $formatted_txns = array_map('format_vendor_transaction_response', $result['transactions']);

    $response = [
        'success' => true,
        'transactions' => $formatted_txns,
        'pagination' => [
            'total' => (int)$result['total'],
            'page' => $page,
            'limit' => $limit,
            'totalPages' => ceil($result['total'] / $limit),
        ]
    ];

    http_response_code(200);
    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>