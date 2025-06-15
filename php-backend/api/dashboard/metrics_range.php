<?php
// FILE: ...\php-backend\api\dashboard\metrics_range.php

// --- Headers ---
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

// --- Dependencies ---
require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/Dashboard.php';

// --- Authorization ---
$user_data = verify_jwt_and_get_user();
if (!in_array($user_data['role'], ['salesman', 'admin', 'superAdmin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

// --- Logic ---
$startDate = $_GET['startDate'] ?? null;
$endDate = $_GET['endDate'] ?? null;

if (!$startDate || !$endDate) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Both startDate and endDate query parameters are required.']);
    exit();
}

// Basic validation for date format (Y-m-d)
if (!preg_match("/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/", $startDate) || 
    !preg_match("/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/", $endDate)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid date format. Please use YYYY-MM-DD.']);
    exit();
}

try {
    $conn = connectDB();
    $dashboard_model = new Dashboard($conn);

    $metrics = $dashboard_model->getDashboardMetricsForDateRange($startDate, $endDate);

    // Assemble the final response to match the original Node.js structure
    $response = [
        'success' => true,
        'financial' => [
            'totalSales' => (float)($metrics['financial']['totalSales'] ?? 0),
            'totalProfit' => (float)($metrics['financial']['totalProfit'] ?? 0),
            'totalVat' => (float)($metrics['financial']['totalVat'] ?? 0),
            'totalExpenses' => (float)($metrics['financial']['totalExpenses'] ?? 0),
            'netProfit' => (float)(($metrics['financial']['totalProfit'] ?? 0) - ($metrics['financial']['totalExpenses'] ?? 0)),
            'totalCredit' => (float)($metrics['payments']['Cash'] ?? 0),
            'totalDebit' => (float)(($metrics['payments']['Bank'] ?? 0) + ($metrics['payments']['Shabka'] ?? 0))
        ],
        'topPerformers' => [
            'salesmen' => $metrics['topSalesmen'],
            'vendors' => $metrics['topVendors']
        ],
        'dateRange' => [
            'startDate' => $startDate,
            'endDate' => $endDate
        ]
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred while fetching dashboard metrics: ' . $e->getMessage()]);
}
?>