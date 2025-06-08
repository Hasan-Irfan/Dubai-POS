<?php
// FILE: ...\php-backend\api\cash\update.php

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

// --- Logic ---
$data = json_decode(file_get_contents("php://input"), true);
$entry_id = $data['id'] ?? null;
$reference = $data['reference'] ?? null;

if (!$entry_id || $reference === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Entry ID and reference are required.']);
    exit();
}

try {
    $conn = connectDB();
    $cash_model = new CashRegister($conn);

    if ($cash_model->updateEntry($entry_id, $reference)) {
        $updated_entry = $cash_model->findEntryById($entry_id);
        $formatted_entry = format_cash_entry_response($updated_entry);

        http_response_code(200);
        echo json_encode(['success' => true, 'entry' => $formatted_entry]);
    } else {
        throw new Exception('Failed to update cash entry or entry not found.');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>