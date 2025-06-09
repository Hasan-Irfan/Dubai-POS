<?php
// FILE: ...\php-backend\api\bank\create.php

// --- Headers ---
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// --- Dependencies ---
require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/BankTransaction.php';
require_once '../../src/Utils/formatters.php';

// --- Authorization ---
// Corresponds to guardBasic in MERN routes 
$user_data = verify_jwt_and_get_user();
if ($user_data['role'] !== 'employee' && $user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

// --- Logic ---
$data = json_decode(file_get_contents("php://input"), true);

// Basic validation, mirroring MERN service validations 
if (!isset($data['type']) || !isset($data['method']) || !isset($data['amount']) || !isset($data['reference'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields: type, method, reference, and amount.']);
    exit();
}
if ($data['amount'] <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Amount must be greater than zero']);
    exit();
}

try {
    $conn = connectDB();
    $bank_model = new BankTransaction($conn);

    // Prepare data for the model method
    $transaction_data = [
        'date' => $data['date'] ?? date('Y-m-d H:i:s'),
        'type' => $data['type'],
        'method' => $data['method'],
        'reference' => $data['reference'],
        'amount' => $data['amount']
    ];

    // The recordTransaction method handles balance calculation and insertion 
    $new_txn_id = $bank_model->recordTransaction($transaction_data);

    if ($new_txn_id) {
        // Fetch the newly created record to return in the response
        $new_txn_db = $bank_model->findTransactionById($new_txn_id);
        // Format the response to match the MERN API payload 
        $formatted_txn = format_bank_transaction_response($new_txn_db);

        http_response_code(201); // 201 Created
        echo json_encode([
            'success' => true,
            'transaction' => $formatted_txn
        ]);
    } else {
        throw new Exception('Failed to record bank transaction.');
    }

} catch (Exception $e) {
    if (strpos($e->getMessage(), 'opening balance entry already exists') !== false) {
        http_response_code(409); // Conflict
        echo json_encode([
            'success' => false,
            'message' => 'An opening balance entry already exists. Only one opening balance is allowed.'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
    }
}
?>