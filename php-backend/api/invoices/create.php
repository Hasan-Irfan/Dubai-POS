<?php
// FILE: ...\php-backend\api\invoices\create.php

header('Access-Control-Allow-Origin: *');

// Specify that the response will be in JSON format.
header('Content-Type: application/json');

// Specify the allowed HTTP methods. For creating, it's POST.
// OPTIONS is included to handle preflight requests from browsers.
header('Access-Control-Allow-Methods: POST, OPTIONS');

// Specify the allowed headers in requests from the frontend.
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Allow cookies to be sent with the request (essential for authentication).
header('Access-Control-Allow-Credentials: true');

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/SalesInvoice.php';
require_once '../../src/Utils/formatters.php';

// --- Authorization ---
$user_data = verify_jwt_and_get_user();
// In the original, all authenticated users can create invoices.
// If you need to restrict, you can add role checks here.

// --- Logic ---
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['invoiceNumber']) || !isset($data['salesmanId']) || !isset($data['items']) || !is_array($data['items'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required invoice data: invoiceNumber, salesmanId, and items are required.']);
    exit();
}

try {
    // --- Calculations (performed on server-side for integrity) ---
    $items_with_totals = [];
    $sub_total = 0;
    $total_vat = 0;
    $total_cost = 0;

    foreach ($data['items'] as $item) {
        $line_total = ($item['unitPrice'] * $item['quantity']) + ($item['vatAmount'] ?? 0);
        $sub_total += $item['unitPrice'] * $item['quantity'];
        $total_vat += $item['vatAmount'] ?? 0;
        $total_cost += $item['costPrice'] * $item['quantity'];

        $items_with_totals[] = [
            'description' => $item['description'],
            'quantity' => $item['quantity'],
            'unit_price' => $item['unitPrice'],
            'cost_price' => $item['costPrice'],
            'vat_amount' => $item['vatAmount'] ?? 0,
            'line_total' => $line_total,
        ];
    }

    $grand_total = $sub_total + $total_vat;
    $total_profit = $sub_total - $total_cost;

    $invoice_data_to_save = [
        'invoice_number' => $data['invoiceNumber'],
        'customer_name' => $data['customerName'] ?? 'Walk-in Customer',
        'salesman_id' => $data['salesmanId'],
        'sub_total' => $sub_total,
        'total_vat' => $total_vat,
        'grand_total' => $grand_total,
        'total_cost' => $total_cost,
        'total_profit' => $total_profit,
        'invoice_date' => $data['date'] ?? date('Y-m-d H:i:s')
    ];

    // --- Database Interaction ---
    $conn = connectDB();
    $invoice_model = new SalesInvoice($conn);
    $new_invoice_id = $invoice_model->createInvoice($invoice_data_to_save, $items_with_totals);

    if ($new_invoice_id) {
        $new_invoice_data = $invoice_model->findInvoiceById($new_invoice_id);
        $formatted_invoice = format_invoice_response($new_invoice_data['invoice'], $new_invoice_data['items'], $new_invoice_data['payments']);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'invoice' => $formatted_invoice
        ]);
    } else {
        throw new Exception("Failed to create the invoice.");
    }

} catch (Exception $e) {
    http_response_code(500);
    if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
         http_response_code(409);
         echo json_encode(['success' => false, 'message' => 'An invoice with this number already exists.']);
    } else {
         echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
    }
}
?>