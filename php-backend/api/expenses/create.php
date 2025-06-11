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

$errors = [];
if (!isset($data['category']) || empty($data['category'])) $errors[] = 'Category is a required field.';
if (!isset($data['description']) || empty($data['description'])) $errors[] = 'Description is a required field.';
if (!isset($data['amount']) || !is_numeric($data['amount'])) $errors[] = 'Amount must be a numeric value.';
if (isset($data['amount']) && is_numeric($data['amount']) && $data['amount'] == 0) $errors[] = 'Amount cannot be zero.';
if (!isset($data['paymentType']) || empty($data['paymentType'])) $errors[] = 'Payment type is a required field.';

// Value validation
$allowed_categories = ['Rent', 'Utilities', 'Salaries', 'Commissions', 'Advances Recovered', 'Inventory', 'Miscellaneous'];
if (isset($data['category']) && !in_array($data['category'], $allowed_categories)) {
    $errors[] = 'Invalid category provided.';
}

$allowed_payment_types = ['Cash', 'Bank', 'Shabka'];
if (isset($data['paymentType']) && !in_array($data['paymentType'], $allowed_payment_types)) {
    $errors[] = 'Invalid payment type provided.';
}

if (!empty($errors)) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Validation failed.', 'errors' => $errors]);
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