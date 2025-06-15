<?php
// FILE: C:\xampp\htdocs\dubai-pos-backend\api\signup.php

header('Access-Control-Allow-Origin: *'); 
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

require_once '../config/database.php';
require_once '../src/Models/User.php';

define('ADMIN_EMAIL', 'superadmin@example.com'); 

$conn = connectDB();
$user = new User($conn);

$data = json_decode(file_get_contents("php://input"));

if (
    !isset($data->username) || !isset($data->email) || !isset($data->password) ||
    empty(trim($data->username)) || empty(trim($data->email)) || empty($data->password)
) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please enter all the fields']);
    exit();
}

if (strlen($data->password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please enter a password of at least 6 characters']);
    exit();
}

// --- Business Logic ---
$username = trim($data->username);
$email = trim($data->email);
$password = $data->password;

try {
    $existingUser = $user->findUserByEmailOrUsername($username, $email);
    if ($existingUser) {
        http_response_code(409); // 409 Conflict
        echo json_encode(['success' => false, 'message' => 'User or Email already exists']);
        exit();
    }

    // Corrected Code
    $role = ($email === ADMIN_EMAIL) ? 'superAdmin' : 'salesman';
    $new_user_id = $user->createUser($username, $email, $password, $role);
    if ($new_user_id) {
        http_response_code(201);
        echo json_encode([
            'id' => $new_user_id, 
            'user' => $username,
            'role' => $role,
            'success' => true,
            'message' => 'User registered successfully'
        ]);
    } else {
        throw new Exception('Error occurred during user creation.');
    }

} catch (Exception $e) {
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Something went wrong: ' . $e->getMessage()
    ]);
}
?>