<?php
// FILE: ...\php-backend\api\expenses\delete.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/CashRegister.php';
require_once '../../src/Models/BankTransaction.php';
require_once '../../src/Models/Expense.php';

$user_data = verify_jwt_and_get_user();
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$expense_id = $data['id'] ?? null;

if (!$expense_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Expense ID is required.']);
    exit();
}

try {
    $conn = connectDB();
    $expense_model = new Expense($conn);

    if ($expense_model->deleteExpense($expense_id)) {
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Expense deleted successfully']);
    } else {
        throw new Exception('Failed to delete expense or expense not found.');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>