<?php
// FILE: ...\php-backend\api\salary\create_payment.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/Salary.php'; // Includes other models

$user_data = verify_jwt_and_get_user();
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['employeeId'], $data['type'], $data['amount'], $data['description'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
    exit();
}

try {
    $conn = connectDB();
    $salary_model = new Salary($conn);

    $payment_data = [
        'employee_id' => $data['employeeId'],
        'type' => $data['type'],
        'amount' => $data['amount'],
        'description' => $data['description'],
        'payment_method' => $data['paymentMethod'] ?? null,
        'date' => $data['date'] ?? date('Y-m-d H:i:s'),
    ];

    $new_payment_id = $salary_model->addSalaryPayment($payment_data);

    if ($new_payment_id) {
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Salary payment recorded successfully.', 'paymentId' => $new_payment_id]);
    } else {
        throw new Exception('Failed to record salary payment.');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>