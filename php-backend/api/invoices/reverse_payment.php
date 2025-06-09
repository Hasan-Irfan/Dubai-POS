<?php
// FILE: ...\php-backend\api\invoices\reverse_payment.php

// --- Headers ---
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

// --- Dependencies ---
require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/SalesInvoice.php';
require_once '../../src/Utils/formatters.php';

// --- Authorization ---
$user_data = verify_jwt_and_get_user();
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

// --- Logic ---
$data = json_decode(file_get_contents("php://input"), true);
$invoice_id = $data['invoiceId'] ?? null;
$payment_id = $data['paymentId'] ?? null;
$reason = $data['reason'] ?? null;

if (!$invoice_id || !$payment_id || !$reason) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invoice ID, Payment ID, and a reason are required.']);
    exit();
}

try {
    $conn = connectDB();
    $invoice_model = new SalesInvoice($conn);

    $success = $invoice_model->reversePayment($invoice_id, $payment_id, $reason);

    if ($success) {
        // Fetch the fully updated invoice to return in the response
        $updated_invoice_data = $invoice_model->findInvoiceById($invoice_id);
        $formatted_invoice = format_invoice_response($updated_invoice_data['invoice'], $updated_invoice_data['items'], $updated_invoice_data['payments']);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Payment reversed successfully.',
            'invoice' => $formatted_invoice
        ]);
    } else {
        throw new Exception("Failed to reverse payment.");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred while reversing the payment: ' . $e->getMessage()]);
}
?>