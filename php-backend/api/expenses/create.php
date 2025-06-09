<?php
// FILE: ...\php-backend\api\expenses\create.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/CashRegister.php'; // Dependency for Expense model
require_once '../../src/Models/BankTransaction.php'; // Dependency for Expense model
require_once '../../src/Models/Expense.php';
require_once '../../src/Utils/formatters.php';

$user_data = verify_jwt_and_get_user();

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['category'], $data['description'], $data['amount'], $data['paymentType'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields: category, description, amount, and paymentType.']);
    exit();
}

try {
    $conn = connectDB();
    $expense_model = new Expense($conn);

    $expense_data = [
        'date' => $data['date'] ?? date('Y-m-d H:i:s'),
        'category' => $data['category'],
        'description' => $data['description'],
        'amount' => $data['amount'],
        'payment_type' => $data['paymentType'],
        'paid_to_id' => $data['paidTo'] ?? null,
        'paid_to_model' => $data['paidToModel'] ?? null
    ];

    $new_expense_id = $expense_model->recordExpense($expense_data);

    if ($new_expense_id) {
        $new_expense_db = $expense_model->findExpenseById($new_expense_id);
        $formatted_expense = format_expense_response($new_expense_db);
        
        http_response_code(201);
        echo json_encode(['success' => true, 'expense' => $formatted_expense]);
    } else {
        throw new Exception('Failed to record expense.');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>