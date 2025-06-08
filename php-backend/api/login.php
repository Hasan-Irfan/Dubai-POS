<?php

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
require_once '../vendor/autoload.php'; 
use Firebase\JWT\JWT;


define('ACCESS_TOKEN_SECRET', 'your_super_secret_access_key_123'); // Change this to a long random string
define('REFRESH_TOKEN_SECRET', 'your_super_secret_refresh_key_456'); // Change this to a long random string

$conn = connectDB();
$user_model = new User($conn);

// --- Input ---
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->email) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email and password are required.']);
    exit();
}

$email = $data->email;
$password = $data->password;

try {
    $user = $user_model->findUserByEmailOrUsername('', $email); 

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit();
    }

    
    if (!password_verify($password, $user['password'])) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Invalid password']);
        exit();
    }

    $user_id = $user['id'];
    $issued_at = time();
    $access_token_expiry = $issued_at + (60 * 60 * 24); 
    $refresh_token_expiry = $issued_at + (60 * 60 * 24 * 10); 

    $access_payload = [
        'iss' => 'dubai-pos-backend', 
        'aud' => 'dubai-pos-frontend',
        'iat' => $issued_at, 
        'exp' => $access_token_expiry, 
        '_id' => $user_id 
    ];

    $refresh_payload = [
        'iss' => 'dubai-pos-backend',
        'aud' => 'dubai-pos-frontend',
        'iat' => $issued_at,
        'exp' => $refresh_token_expiry,
        '_id' => $user_id 
    ];

    $accessToken = JWT::encode($access_payload, ACCESS_TOKEN_SECRET, 'HS256');
    $refreshToken = JWT::encode($refresh_payload, REFRESH_TOKEN_SECRET, 'HS256');

    
    $user_model->updateRefreshToken($user_id, $refreshToken);

    $cookie_options = [
        'expires' => $refresh_token_expiry,
        'path' => '/',
        'domain' => '', // an empty value allows the cookie to be sent for the current host
        'secure' => false, // Set to true if you are using HTTPS
        'httponly' => true, // Important for security!
        'samesite' => 'Lax' // Or 'Strict'
    ];
    setcookie('refreshToken', $refreshToken, $cookie_options);
    setcookie('accessToken', $accessToken, $cookie_options);


    // 6. Send final response
    // Using 201 status code to match the original implementation 
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Logged in successfully',
        'user' => [
            'id' => $user_id,
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role'],
            'token' => $accessToken // The original also included the token in the body 
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>