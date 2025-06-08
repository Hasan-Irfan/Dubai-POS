<?php
// FILE: ...\php-backend\api\vendors\delete.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
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
$data = json_decode(file_get_contents("php://input"), true);
$vendor_id = $data['id'] ?? null;

if (!$vendor_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Vendor ID is required.']);
    exit();
}

try {
    $conn = connectDB();
    $vendor_model = new Vendor($conn);

    // To match the original API's response, we fetch the vendor's data before deleting
    $vendor_to_delete = $vendor_model->findVendorById($vendor_id);

    if (!$vendor_to_delete) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Vendor not found.']);
        exit();
    }

    // Attempt to soft-delete the vendor
    if ($vendor_model->softDeleteVendor($vendor_id)) {
        // The original API returns the object that was deleted.
        // We'll format the object we fetched earlier.
        $formatted_vendor = format_vendor_response($vendor_to_delete);
        $formatted_vendor['status'] = 'deleted'; // Manually update status in the response object

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'vendor' => $formatted_vendor
        ]);
    } else {
        // This case might happen if the vendor was deleted between the find and delete operations
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Vendor not found or already deleted.']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>