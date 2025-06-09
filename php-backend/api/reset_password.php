<?php
// FILE: ...\php-backend\api\reset_password.php

// --- Headers ---
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

// --- Dependencies ---
require_once '../vendor/autoload.php';
require_once '../config/database.php';
require_once '../config/jwt_config.php';
require_once '../config/mail_config.php';
require_once '../src/Models/User.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use Firebase\JWT\JWT;

// --- Logic ---
$data = json_decode(file_get_contents("php://input"));
$email = $data->email ?? null;

if (!$email) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email address is required.']);
    exit();
}

try {
    $conn = connectDB();
    $user_model = new User($conn);
    $user = $user_model->findUserByEmailOrUsername('', $email);

    if (!$user) {
        // IMPORTANT: For security, do not reveal that the user does not exist.
        // Send a success message as if the email was sent.
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'If an account with that email exists, a password reset link has been sent.']);
        exit();
    }

    // Generate a short-lived reset token (e.g., 10 minutes)
    $reset_payload = [
        'iss' => 'dubai-pos-backend',
        'aud' => 'dubai-pos-frontend',
        'iat' => time(),
        'exp' => time() + (60 * 10), // Expires in 10 minutes
        '_id' => $user['id']
    ];
    $resetToken = JWT::encode($reset_payload, RESET_TOKEN_SECRET, 'HS256');

    // --- Email Sending Logic ---
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = MAIL_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = MAIL_USERNAME;
    $mail->Password   = MAIL_PASSWORD;
    $mail->SMTPSecure = MAIL_SMTP_SECURE;
    $mail->Port       = MAIL_PORT;

    $mail->setFrom(MAIL_FROM_ADDRESS, MAIL_FROM_NAME);
    $mail->addAddress($user['email'], $user['username']);
    
    $mail->isHTML(true);
    $mail->Subject = 'Password Reset Request';
    $resetLink = FRONTEND_URL . '/update-password/' . $resetToken;
    $mail->Body    = "Hello,<br><br>You requested a password reset. Please click the link below to reset your password. This link is valid for 10 minutes.<br><br><a href='{$resetLink}'>Reset Password</a><br><br>If you did not request this, please ignore this email.";
    $mail->AltBody = 'To reset your password, please visit the following URL: ' . $resetLink;

    $mail->send();
    
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'If an account with that email exists, a password reset link has been sent.']);

} catch (Exception $e) {
    // Generic error to avoid leaking information
    http_response_code(500);
    // For debugging: error_log("Mailer Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred while trying to send the reset email.']);
}
?>
