<?php
// FILE: ...\php-backend\api\cash\create.php

// --- Headers ---
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// --- Dependencies ---
require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/CashRegister.php';
require_once '../../src/Utils/formatters.php';

// --- Authorization ---
$user_data = verify_jwt_and_get_user();
if ($user_data['role'] !== 'employee' && $user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

// --- Logic ---
$data = json_decode(file_get_contents("php://input"), true);

// Basic validation
if (!isset($data['type']) || !isset($data['amount']) || !isset($data['reference'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields: type, amount, and reference.']);
    exit();
}

try {
    $conn = connectDB();
    $cash_model = new CashRegister($conn);

    $entry_data = [
        'date' => $data['date'] ?? date('Y-m-d H:i:s'),
        'type' => $data['type'],
        'reference' => $data['reference'],
        'amount' => $data['amount']
    ];

    $new_entry_id = $cash_model->recordCashEntry($entry_data);

    if ($new_entry_id) {
        $new_entry_db = $cash_model->findEntryById($new_entry_id);
        $formatted_entry = format_cash_entry_response($new_entry_db);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'entry' => $formatted_entry
        ]);
    } else {
        throw new Exception('Failed to record cash entry.');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>
