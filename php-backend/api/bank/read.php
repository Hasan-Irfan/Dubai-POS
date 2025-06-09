<?php
// FILE: ...\php-backend\api\bank\read.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/BankTransaction.php';
require_once '../../src/Utils/formatters.php';

$user_data = verify_jwt_and_get_user();

try {
    $conn = connectDB();
    $bank_model = new BankTransaction($conn);

    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $result = $bank_model->getAllTransactions([
        'method' => $_GET['method'] ?? null,
        'from' => $_GET['from'] ?? null,
        'to' => $_GET['to'] ?? null,
        'limit' => $limit,
        'offset' => $offset
    ]);

    $formatted_txns = array_map('format_bank_transaction_response', $result['transactions']);

    $response = [
        'success' => true,
        'transactions' => $formatted_txns,
        'pagination' => [
            'total' => (int)$result['total'],
            'page' => $page,
            'limit' => $limit,
            'totalPages' => ceil($result['total'] / $limit),
            'hasNextPage' => $page < ceil($result['total'] / $limit),
            'hasPrevPage' => $page > 1
        ]
    ];

    http_response_code(200);
    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>