<?php
// FILE: ...\php-backend\api\cash\read.php


header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// --- Dependencies ---
require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/CashRegister.php';
require_once '../../src/Utils/formatters.php';

// --- Authorization ---
$user_data = verify_jwt_and_get_user();
// All authenticated users can view cash entries

// --- Logic ---
try {
    $conn = connectDB();
    $cash_model = new CashRegister($conn);

    // Get query parameters for filtering and pagination
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $type = $_GET['type'] ?? null;
    $from = $_GET['from'] ?? null;
    $to = $_GET['to'] ?? null;

    $result = $cash_model->getAllEntries([
        'type' => $type,
        'from' => $from,
        'to' => $to,
        'limit' => $limit,
        'offset' => $offset
    ]);

    $total_entries = $result['total'];
    $entries_db = $result['entries'];

    // Format each entry record for the response
    $formatted_entries = [];
    foreach ($entries_db as $entry) {
        $formatted_entries[] = format_cash_entry_response($entry);
    }

    // Build the final response object to match the original API
    $response = [
        'success' => true,
        'entries' => $formatted_entries,
        'pagination' => [
            'total' => (int)$total_entries,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => ceil($total_entries / $limit),
            'hasNextPage' => $page < ceil($total_entries / $limit),
            'hasPrevPage' => $page > 1
        ]
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>