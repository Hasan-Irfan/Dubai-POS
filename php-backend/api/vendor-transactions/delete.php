<?php
// FILE: ...\php-backend\api\vendor-transactions\delete.php

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
require_once '../../src/Models/VendorTransaction.php';
require_once '../../src/Utils/formatters.php';

$user_data = verify_jwt_and_get_user();
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$txn_id = $data['id'] ?? null;

if (!$txn_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Transaction ID is required.']);
    exit();
}

try {
    $conn = connectDB();
    $txn_model = new VendorTransaction($conn);
    $txn_to_delete = $txn_model->findTransactionById($txn_id);

    if ($txn_model->deleteTransaction($txn_id)) {
        $formatted_txn = format_vendor_transaction_response($txn_to_delete);
        $formatted_txn['status'] = 'deleted';

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'transaction' => $formatted_txn
        ]);
    } else {
        throw new Exception('Failed to delete transaction or transaction not found.');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>