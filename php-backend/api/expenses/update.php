<?php
// FILE: ...\php-backend\api\expenses\update.php

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
require_once '../../src/Utils/formatters.php';

$user_data = verify_jwt_and_get_user();

$data = json_decode(file_get_contents("php://input"), true);
$expense_id = $data['id'] ?? null;
$update_payload = $data['updateData'] ?? null;

if (!$expense_id || !$update_payload) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Expense ID and updateData are required.']);
    exit();
}

try {
    $conn = connectDB();
    $expense_model = new Expense($conn);

    // Map frontend keys to database columns
    $db_update_data = [];
    if(isset($update_payload['date'])) $db_update_data['entry_date'] = $update_payload['date'];
    if(isset($update_payload['category'])) $db_update_data['category'] = $update_payload['category'];
    if(isset($update_payload['description'])) $db_update_data['description'] = $update_payload['description'];
    if(isset($update_payload['amount'])) $db_update_data['amount'] = $update_payload['amount'];
    if(isset($update_payload['paymentType'])) $db_update_data['payment_type'] = $update_payload['paymentType'];
    if(isset($update_payload['paidTo'])) $db_update_data['paid_to_id'] = $update_payload['paidTo'];
    if(isset($update_payload['paidToModel'])) $db_update_data['paid_to_model'] = $update_payload['paidToModel'];

    if ($expense_model->updateExpense($expense_id, $db_update_data)) {
        $updated_expense = $expense_model->findExpenseById($expense_id);
        $formatted_expense = format_expense_response($updated_expense);

        http_response_code(200);
        echo json_encode(['success' => true, 'expense' => $formatted_expense]);
    } else {
        throw new Exception('Failed to update expense or expense not found.');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred during update: ' . $e->getMessage()]);
}
?>