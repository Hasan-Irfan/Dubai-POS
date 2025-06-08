<?php
// FILE: ...\php-backend\api\vendors\read.php

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
require_once '../../src/Models/Vendor.php';
require_once '../../src/Utils/formatters.php';

// --- Authorization ---
$user_data = verify_jwt_and_get_user();
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

// --- Logic ---
try {
    $conn = connectDB();
    $vendor_model = new Vendor($conn);

    // Get query parameters for filtering and pagination
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $search = $_GET['search'] ?? null;
    $offset = ($page - 1) * $limit;

    $result = $vendor_model->getAllVendors([
        'search' => $search,
        'limit' => $limit,
        'offset' => $offset
    ]);

    $total_vendors = $result['total'];
    $vendors_db = $result['vendors'];

    // Format each vendor record for the response
    $formatted_vendors = [];
    foreach ($vendors_db as $vendor) {
        $formatted_vendors[] = format_vendor_response($vendor);
    }

    // Build the final response object to match the original API
    $response = [
        'success' => true,
        'vendors' => $formatted_vendors,
        'pagination' => [
            'total' => (int)$total_vendors,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => ceil($total_vendors / $limit),
            'hasNextPage' => $page < ceil($total_vendors / $limit),
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