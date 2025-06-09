<?php
// FILE: ...\php-backend\api\expenses\read.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/Expense.php';
require_once '../../src/Utils/formatters.php';

$user_data = verify_jwt_and_get_user();

try {
    $conn = connectDB();
    $expense_model = new Expense($conn);

    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $result = $expense_model->getAllExpenses([
        'category' => $_GET['category'] ?? null,
        'payment_type' => $_GET['paymentType'] ?? null,
        'search' => $_GET['search'] ?? null,
        'limit' => $limit,
        'offset' => $offset
    ]);

    $formatted_expenses = array_map('format_expense_response', $result['expenses']);

    $response = [
        'success' => true,
        'expenses' => $formatted_expenses,
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