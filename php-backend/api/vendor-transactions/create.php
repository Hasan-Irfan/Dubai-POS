<?php
// FILE: ...\php-backend\api\vendor-transactions\create.php

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

if (!isset($data['vendorId'], $data['type'], $data['description'], $data['amount'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
    exit();
}
if ($data['type'] === 'Payment' && !isset($data['method'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Payment method is required for Payment type.']);
    exit();
}


try {
    $conn = connectDB();
    $txn_model = new VendorTransaction($conn);

    $txn_data = [
        'vendor_id' => $data['vendorId'],
        'type' => $data['type'],
        'description' => $data['description'],
        'amount' => $data['amount'],
        'method' => $data['method'] ?? null,
        'date' => $data['date'] ?? date('Y-m-d H:i:s'),
    ];

    $new_txn_id = $txn_model->addTransaction($txn_data);

    if ($new_txn_id) {
        $new_txn_db = $txn_model->findTransactionById($new_txn_id);
        $formatted_txn = format_vendor_transaction_response($new_txn_db);
        
        http_response_code(201);
        echo json_encode(['success' => true, 'transaction' => $formatted_txn]);
    } else {
        throw new Exception('Failed to record vendor transaction.');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>