<?php
// FILE: ...\php-backend\api\employees\read.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
// ... (all other headers)

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/Employee.php';
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
    $employee_model = new Employee($conn);

    // Get query parameters for filtering and pagination
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $role = $_GET['role'] ?? null;
    $search = $_GET['search'] ?? null;
    $offset = ($page - 1) * $limit;

    $result = $employee_model->getAllEmployees([
        'role' => $role,
        'search' => $search,
        'limit' => $limit,
        'offset' => $offset
    ]);

    $total_employees = $result['total'];
    $employees_db = $result['employees'];

    // Format each employee record for the response
    $formatted_employees = [];
    foreach ($employees_db as $employee) {
        $formatted_employees[] = format_employee_response($employee);
    }

    // Build the final response object to match the original API
    $response = [
        'success' => true,
        'employees' => $formatted_employees,
        'pagination' => [
            'total' => (int)$total_employees,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => ceil($total_employees / $limit),
        ]
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>