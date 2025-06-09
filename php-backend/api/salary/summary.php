<?php
// FILE: ...\php-backend\api\salary\summary.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/Salary.php';

$user_data = verify_jwt_and_get_user();
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

$employee_id = $_GET['employeeId'] ?? null;
if (!$employee_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'employeeId query parameter is required.']);
    exit();
}

try {
    $conn = connectDB();
    $salary_model = new Salary($conn);

    $summary = $salary_model->getEmployeeSalarySummary($employee_id);

    http_response_code(200);
    echo json_encode(['success' => true, 'summary' => $summary]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>