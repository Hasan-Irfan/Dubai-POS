<?php
// FILE: ...\php-backend\api\employees\delete.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS'); // Using POST for simplicity
// ... (all other headers)

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/Employee.php';

// --- Authorization ---
$user_data = verify_jwt_and_get_user();
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

// --- Logic ---
$data = json_decode(file_get_contents("php://input"), true);

$employee_id = $data['id'] ?? null;

if (!$employee_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Employee ID is required.']);
    exit();
}

try {
    $conn = connectDB();
    $employee_model = new Employee($conn);

    // Attempt to delete the employee
    if ($employee_model->deleteEmployee($employee_id)) {
        // Send success response, matching the original API
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Employee deleted successfully'
        ]);
    } else {
        // If deleteEmployee returns false, it means no record was found with that ID
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Employee not found.']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>