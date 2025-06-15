<?php
// FILE: ...\php-backend\api\invoices\update.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/SalesInvoice.php';
require_once '../../src/Utils/formatters.php';

// --- Authorization ---
$user_data = verify_jwt_and_get_user();
// Add this authorization block
if (!in_array($user_data['role'], ['salesman', 'admin', 'superAdmin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}
// --- Logic ---
$data = json_decode(file_get_contents("php://input"), true);
$invoice_id = $data['id'] ?? null;
$update_payload = $data['updateData'] ?? null;

if (!$invoice_id || !$update_payload) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invoice ID and updateData are required.']);
    exit();
}

try {
    $conn = connectDB();
    $invoice_model = new SalesInvoice($conn);

    // 1. Fetch the current state of the invoice
    $current_invoice_data = $invoice_model->findInvoiceById($invoice_id);

    if (!$current_invoice_data) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Invoice not found.']);
        exit();
    }

    // 2. ENFORCE BUSINESS RULE: Cannot update an invoice that has payments
    if (count($current_invoice_data['payments']) > 0) {
        http_response_code(403); // Forbidden
        echo json_encode(['success' => false, 'message' => 'This invoice cannot be updated because it has payments recorded. Please delete this invoice and create a new one instead.']);
        exit();
    }

    // --- Prepare data for update ---
    $invoice_update_data = [];
    $items_update_data = null;

    // If 'items' are part of the update, we must recalculate all totals
    if (isset($update_payload['items'])) {
        $items_with_totals = [];
        $sub_total = 0;
        $total_vat = 0;
        $total_cost = 0;

        foreach ($update_payload['items'] as $item) {
            $line_total = ($item['unitPrice'] * $item['quantity']) + ($item['vatAmount'] ?? 0);
            $sub_total += $item['unitPrice'] * $item['quantity'];
            $total_vat += $item['vatAmount'] ?? 0;
            $total_cost += $item['costPrice'] * $item['quantity'];
            $items_with_totals[] = ['description' => $item['description'], 'quantity' => $item['quantity'], 'unit_price' => $item['unitPrice'], 'cost_price' => $item['costPrice'], 'vat_amount' => $item['vatAmount'] ?? 0, 'line_total' => $line_total];
        }
        $items_update_data = $items_with_totals;

        $invoice_update_data['sub_total'] = $sub_total;
        $invoice_update_data['total_vat'] = $total_vat;
        $invoice_update_data['grand_total'] = $sub_total + $total_vat;
        $invoice_update_data['total_cost'] = $total_cost;
        $invoice_update_data['total_profit'] = $sub_total - $total_cost;
    }

    // Add other updatable fields
    if (isset($update_payload['customerName'])) {
        $invoice_update_data['customer_name'] = $update_payload['customerName'];
    }
    if (isset($update_payload['date'])) {
        $invoice_update_data['invoice_date'] = $update_payload['date'];
    }

    // --- Database Interaction ---
    $success = $invoice_model->updateInvoice($invoice_id, $invoice_update_data, $items_update_data);

    if ($success) {
        $updated_invoice_data = $invoice_model->findInvoiceById($invoice_id);
        $formatted_invoice = format_invoice_response($updated_invoice_data['invoice'], $updated_invoice_data['items'], $updated_invoice_data['payments']);

        http_response_code(200);
        echo json_encode(['success' => true, 'invoice' => $formatted_invoice]);
    } else {
        throw new Exception('Database update failed.');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred during invoice update: ' . $e->getMessage()]);
}
?>