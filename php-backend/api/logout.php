<?php
// FILE: C:\xampp\htdocs\hassan-pos\Dubai-POS\php-backend\api\logout.php

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
require_once '../src/Middleware/authChecker.php';
require_once '../config/database.php';
require_once '../src/Models/User.php';

// --- Logic ---

// 1. Protect the route. This is the equivalent of app.use(jwtVerify).
// The verify_jwt_and_get_user() function will handle failures and exit if the user is not authenticated.
$user_data = verify_jwt_and_get_user();

try {
    // 2. Invalidate the Refresh Token in the database.
    // This corresponds to `User.findByIdAndUpdate(user._id, { $unset: { refreshToken: 1 } })` 
    // We achieve this by setting the refreshToken to NULL.
    $conn = connectDB();
    $user_model = new User($conn);
    $user_model->updateRefreshToken($user_data['id'], null);

    // 3. Clear the authentication cookies.
    // This is the PHP equivalent of `res.clearCookie()`. 
    // We set the cookie's expiration date to a time in the past.
    $cookie_options = [
        'expires' => time() - 3600, // 1 hour in the past
        'path' => '/',
        'domain' => '',
        'secure' => false, // Set to true if using HTTPS
        'httponly' => true,
        'samesite' => 'Lax'
    ];
    setcookie('accessToken', '', $cookie_options);
    setcookie('refreshToken', '', $cookie_options);

    // 4. Send the final success response, matching the original.
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Logged out successfully'
    ]); // 

} catch (Exception $e) {
    // Generic error handler
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Something went wrong during logout: ' . $e->getMessage()
    ]);
}
?>