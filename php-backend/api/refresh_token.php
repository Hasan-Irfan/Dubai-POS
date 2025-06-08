<?php
// FILE: C:\xampp\htdocs\hassan-pos\Dubai-POS\php-backend\api\refresh_token.php

// Set headers for JSON response and CORS
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// --- Dependencies ---
require_once '../config/database.php';
require_once '../config/jwt_config.php';
require_once '../src/Models/User.php';
require_once '../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

try {
    // 1. Get the refresh token from the httpOnly cookie. 
    $incomingRefreshToken = $_COOKIE['refreshToken'] ?? null;

    if (!$incomingRefreshToken) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized request: No refresh token provided']);
        exit();
    }

    // 2. Verify the refresh token's signature and expiration.
    $decoded = JWT::decode($incomingRefreshToken, new Key(REFRESH_TOKEN_SECRET, 'HS256'));

    // 3. Find the user from the token's payload. 
    $conn = connectDB();
    $user_model = new User($conn);
    $user = $user_model->findUserById($decoded->_id);

    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid refresh token: User not found']);
        exit();
    }

    // 4. CRITICAL: Compare incoming token with the one stored in the database. 
    // This prevents stolen/reused refresh tokens.
    if ($incomingRefreshToken !== $user['refreshToken']) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Refresh token has been invalidated. Please log in again.']);
        exit();
    }

    // 5. If all checks pass, generate a NEW access token. 
    $user_id = $user['id'];
    $issued_at = time();
    $access_token_expiry = $issued_at + (60 * 60 * 24); // 1 day 

    $access_payload = [
        'iss' => 'dubai-pos-backend',
        'iat' => $issued_at,
        'exp' => $access_token_expiry,
        '_id' => $user_id
    ];

    $newAccessToken = JWT::encode($access_payload, ACCESS_TOKEN_SECRET, 'HS256');

    // 6. Set the new access token as a cookie. 
    $cookie_options = [
        'expires' => $access_token_expiry, // Set cookie to expire with the new token
        'path' => '/',
        'domain' => '',
        'secure' => false, // Set to true if using HTTPS
        'httponly' => true,
        'samesite' => 'Lax'
    ];
    setcookie('accessToken', $newAccessToken, $cookie_options);

    // 7. Send the successful response, including the new token in the body. 
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Access token refreshed',
        'accessToken' => $newAccessToken,
        'refreshToken' => $incomingRefreshToken // Send back the same refresh token
    ]);

} catch (Exception $e) {
    // This will catch JWT verification errors (expired, invalid signature, etc.) 
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid or expired refresh token: ' . $e->getMessage()
    ]);
}
?>