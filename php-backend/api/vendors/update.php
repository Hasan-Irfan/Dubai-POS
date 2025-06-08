<?php
// FILE: ...\php-backend\api\vendors\update.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS'); // Using POST for simplicity and broader compatibility
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
$update_payload = $data['updateData'] ?? null;

if (!$vendor_id || !$update_payload) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Vendor ID and updateData are required.']);
    exit();
}

try {
    $conn = connectDB();
    $vendor_model = new Vendor($conn);

    // Map the potentially nested/camelCase payload to our flat/snake_case database columns
    $db_update_data = [];
    if (isset($update_payload['name'])) $db_update_data['name'] = $update_payload['name'];
    if (isset($update_payload['openingBalance'])) $db_update_data['opening_balance'] = $update_payload['openingBalance'];
    if (isset($update_payload['status'])) $db_update_data['status'] = $update_payload['status'];

    if (isset($update_payload['contact'])) {
        if (isset($update_payload['contact']['phone'])) $db_update_data['phone'] = $update_payload['contact']['phone'];
        if (isset($update_payload['contact']['email'])) $db_update_data['email'] = $update_payload['contact']['email'];
        if (isset($update_payload['contact']['address'])) $db_update_data['address'] = $update_payload['contact']['address'];
    }

    // Update the vendor in the database
    $success = $vendor_model->updateVendor($vendor_id, $db_update_data);

    if ($success) {
        // Fetch the complete, updated record
        $updated_vendor_db = $vendor_model->findVendorById($vendor_id);
        // Format it for the response to ensure consistency
        $formatted_vendor = format_vendor_response($updated_vendor_db);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'vendor' => $formatted_vendor
        ]);
    } else {
        throw new Exception('Database update failed.');
    }

} catch (Exception $e) {
    http_response_code(500);
    if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
         http_response_code(409);
         echo json_encode(['success' => false, 'message' => 'A vendor with this email already exists.']);
    } else {
         echo json_encode(['success' => false, 'message' => 'An error occurred during update: ' . $e->getMessage()]);
    }
}
?>