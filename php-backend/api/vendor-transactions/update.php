<?php
// FILE: ...\php-backend\api\vendor-transactions\update.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
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

$data = json_decode(file_get_contents("php://input"), true);
$txn_id = $data['id'] ?? null;
$description = $data['description'] ?? null;

if (!$txn_id || $description === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Transaction ID and description are required.']);
    exit();
}

try {
    $conn = connectDB();
    $txn_model = new VendorTransaction($conn);

    if ($txn_model->updateTransaction($txn_id, $description)) {
        $updated_txn = $txn_model->findTransactionById($txn_id);
        $formatted_txn = format_vendor_transaction_response($updated_txn);

        http_response_code(200);
        echo json_encode(['success' => true, 'transaction' => $formatted_txn]);
    } else {
        throw new Exception('Failed to update transaction or transaction not found.');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>