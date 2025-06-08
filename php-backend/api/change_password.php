<?php
// FILE: C:\xampp\htdocs\hassan-pos\Dubai-POS\php-backend\api\change_password.php

// Set headers for JSON response and CORS
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// --- Dependencies ---
require_once '../src/Middleware/authChecker.php';
require_once '../config/database.php';
require_once '../src/Models/User.php';

// --- Logic ---

// 1. Protect the route. This ensures only a logged-in user can access this.
$user_data = verify_jwt_and_get_user();
$user_id = $user_data['id'];

// 2. Get the posted data
$data = json_decode(file_get_contents("php://input"));

// 3. Validate the input, matching the original controller's logic 
if (!isset($data->password) || empty($data->password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please enter a new password']);
    exit();
}

if (strlen($data->password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters long']);
    exit();
}

// 4. Update the password in the database
try {
    $conn = connectDB();
    $user_model = new User($conn);

    if ($user_model->updatePassword($user_id, $data->password)) {
        // 5. Send success response
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Password changed successfully'
        ]);
    } else {
        throw new Exception('Failed to update password in the database.');
    }

} catch (Exception $e) {
    // Generic error handler
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to change password: ' . $e->getMessage()
    ]);
}
?>