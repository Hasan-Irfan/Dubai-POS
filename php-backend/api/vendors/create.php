<?php
// FILE: ...\php-backend\api\vendors\create.php

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

if (!isset($data['name']) || !isset($data['contact'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required vendor fields.']);
    exit();
}

try {
    $conn = connectDB();
    $vendor_model = new Vendor($conn);

    // Prepare data for the model, matching the original payload structure
    $vendor_data = [
        'name' => $data['name'],
        'email' => $data['contact']['email'] ?? null,
        'phone' => $data['contact']['phone'] ?? null,
        'address' => $data['contact']['address'] ?? null,
        'opening_balance' => $data['openingBalance'] ?? 0
    ];

    $new_vendor_id = $vendor_model->createVendor($vendor_data);

    if ($new_vendor_id) {
        $new_vendor_db = $vendor_model->findVendorById($new_vendor_id);
        $formatted_vendor = format_vendor_response($new_vendor_db);

        http_response_code(201); // 201 Created
        echo json_encode([
            'success' => true,
            'vendor' => $formatted_vendor
        ]);
    } else {
        throw new Exception('Failed to create vendor.');
    }

} catch (Exception $e) {
    http_response_code(500);
    if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
         http_response_code(409); // Conflict
         echo json_encode(['success' => false, 'message' => 'A vendor with this email already exists.']);
    } else {
         echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
    }
}
?>