<?php
// FILE: ...\php-backend\api\reports\monthly.php

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
require_once '../../src/Models/Reports.php';

// --- Authorization ---
$user_data = verify_jwt_and_get_user();
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

// --- Logic ---
$startDate = $_GET['from'] ?? null;
$endDate = $_GET['to'] ?? null;

if (!$startDate || !$endDate) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => "Missing 'from' or 'to' query parameters."]);
    exit();
}

// Append time to ensure the whole day is included in the range
$startDate .= ' 00:00:00';
$endDate .= ' 23:59:59';

try {
    $conn = connectDB();
    $report_model = new Report($conn);

    $result = $report_model->getMonthlySummary($startDate, $endDate);

    // Format the summary rows to match the camelCase 'totalSAR' key
    $formatted_summary = [];
    foreach ($result['summary'] as $row) {
        $formatted_summary[] = [
            'description' => $row['description'],
            'type' => $row['type'],
            'totalSAR' => (float)$row['amount']
        ];
    }

    $response = [
        'success' => true,
        'summary' => [
            'summary' => $formatted_summary,
            'totals' => [
                'creditSAR' => (float)$result['totals']['creditSAR'],
                'debitSAR' => (float)$result['totals']['debitSAR']
            ]
        ]
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred while generating the report: ' . $e->getMessage()]);
}
?>