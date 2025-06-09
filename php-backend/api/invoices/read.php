<?php
// FILE: ...\php-backend\api\invoices\read.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/SalesInvoice.php';
require_once '../../src/Utils/formatters.php';

// --- Authorization ---
$user_data = verify_jwt_and_get_user();
// All authenticated users can list invoices.

// --- Logic ---
try {
    $conn = connectDB();
    $invoice_model = new SalesInvoice($conn);

    // Get query parameters for filtering and pagination from the original API
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $filters = [
        'status' => $_GET['status'] ?? null,
        'salesmanId' => $_GET['salesmanId'] ?? null,
        'customerName' => $_GET['customerName'] ?? null
    ];

    $from = $_GET['from'] ?? null;
    $to = $_GET['to'] ?? null;
    // The original API's sort param is complex. We'll simplify to just asc/desc for now.
    $sort = isset($_GET['sort']) && strpos($_GET['sort'], 'createdAt') !== false && !strpos($_GET['sort'], '-') ? 'asc' : 'desc';

    $result = $invoice_model->getAllInvoices([
        'filters' => $filters,
        'from' => $from,
        'to' => $to,
        'sort' => $sort,
        'limit' => $limit,
        'offset' => $offset
    ]);

    $total_invoices = $result['total'];
    $invoices_data = $result['invoices'];

    // Format each invoice record for the response
    $formatted_invoices = [];
    foreach ($invoices_data as $invoice_data) {
        $formatted_invoices[] = format_invoice_response(
            $invoice_data['invoice'], 
            $invoice_data['items'], 
            $invoice_data['payments']
        );
    }

    // Build the final response object to match the original API
    $response = [
        'success' => true,
        'invoices' => $formatted_invoices,
        'pagination' => [
            'total' => (int)$total_invoices,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => ceil($total_invoices / $limit),
            'hasNextPage' => $page < ceil($total_invoices / $limit),
            'hasPrevPage' => $page > 1
        ]
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred while fetching invoices: ' . $e->getMessage()]);
}
?>