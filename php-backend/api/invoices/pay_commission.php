<?php
// FILE: ...\php-backend\api\invoices\pay_commission.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/SalesInvoice.php'; // Includes other models as needed
require_once '../../src/Utils/formatters.php';

$user_data = verify_jwt_and_get_user();
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$invoice_id = $data['id'] ?? null;
$payment_data = $data['paymentData'] ?? null;

if (!$invoice_id || !$payment_data || !isset($payment_data['amount']) || !isset($payment_data['method'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invoice ID and paymentData (amount, method) are required.']);
    exit();
}

try {
    $conn = connectDB();
    $invoice_model = new SalesInvoice($conn);
    $success = $invoice_model->payCommission($invoice_id, $payment_data);

    if ($success) {
        $updated_invoice_data = $invoice_model->findInvoiceById($invoice_id);
        $formatted_invoice = format_invoice_response($updated_invoice_data['invoice'], $updated_invoice_data['items'], $updated_invoice_data['payments']);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Commission paid successfully.',
            'invoice' => $formatted_invoice
        ]);
    } else {
        throw new Exception("Failed to pay commission.");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred while paying commission: ' . $e->getMessage()]);
}
?>