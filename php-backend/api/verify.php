<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Include and run the auth checker middleware
require_once '../src/Middleware/authChecker.php';
$user = verify_jwt_and_get_user();

// If the script reaches this point, the user is authenticated.
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Token is valid',
    'user' => $user // Send back the user data
]);
?>