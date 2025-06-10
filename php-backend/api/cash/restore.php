<?php
// FILE: ...\php-backend\api\cash\restore.php

// --- Headers ---
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

// --- Dependencies ---
require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/CashRegister.php';
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
$entry_id = $data['id'] ?? null;

if (!$entry_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Cash entry ID is required.']);
    exit();
}

try {
    $conn = connectDB();
    $cash_model = new CashRegister($conn);

    if ($cash_model->restoreEntry($entry_id)) {
        $restored_entry = $cash_model->findEntryById($entry_id);
        $formatted_entry = format_cash_entry_response($restored_entry);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Cash entry restored successfully.',
            'entry' => $formatted_entry
        ]);
    } else {
        throw new Exception('Failed to restore cash entry or entry not found.');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>
