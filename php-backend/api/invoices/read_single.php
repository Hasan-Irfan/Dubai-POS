<?php
// FILE: ...\php-backend\api\invoices\read_single.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/SalesInvoice.php';
require_once '../../src/Utils/formatters.php';

// --- Authorization ---
$user_data = verify_jwt_and_get_user();
// All authenticated users can view an invoice, no specific role check needed.

// --- Logic ---
try {
    // 1. Get the invoice ID from the query string
    $invoice_id = $_GET['id'] ?? null;

    if (!$invoice_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invoice ID is required.']);
        exit();
    }

    $conn = connectDB();
    $invoice_model = new SalesInvoice($conn);

    // 2. Reuse the findInvoiceById method from our model
    $invoice_data = $invoice_model->findInvoiceById($invoice_id);

    // 3. Check if an invoice was found
    if (!$invoice_data) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Invoice not found.']);
        exit();
    }

    // 4. Reuse our formatter to build the final, nested response object
    $formatted_invoice = format_invoice_response(
        $invoice_data['invoice'], 
        $invoice_data['items'], 
        $invoice_data['payments']
    );

    // 5. Send the successful response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'invoice' => $formatted_invoice
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred while fetching the invoice: ' . $e->getMessage()]);
}
?>