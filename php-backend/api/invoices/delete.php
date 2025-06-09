<?php
// FILE: ...\php-backend\api\invoices\delete.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/SalesInvoice.php';
require_once '../../src/Utils/formatters.php';


$user_data = verify_jwt_and_get_user();
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$invoice_id = $data['id'] ?? null;

if (!$invoice_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invoice ID is required.']);
    exit();
}

try {
    $conn = connectDB();
    $invoice_model = new SalesInvoice($conn);

    
    $invoice_to_delete = $invoice_model->findInvoiceById($invoice_id);

    if (!$invoice_to_delete) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Invoice not found.']);
        exit();
    }

    // Attempt to delete the invoice
    if ($invoice_model->deleteInvoice($invoice_id)) {
        // The original API returns the object that was deleted.
        $formatted_invoice = format_invoice_response(
            $invoice_to_delete['invoice'], 
            $invoice_to_delete['items'],
            [] // Payments are now deleted, so pass an empty array
        );
        $formatted_invoice['status'] = 'deleted'; // Manually update status in the response

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'invoice' => $formatted_invoice
        ]);
    } else {
        throw new Exception("Failed to delete invoice.");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>