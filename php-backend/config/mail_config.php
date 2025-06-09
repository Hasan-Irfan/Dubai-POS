<?php
// FILE: ...\php-backend\config\mail_config.php

/**
 * PHPMailer Configuration
 * * Replace these values with your actual SMTP credentials.
 * This mirrors the EMAIL_USER and EMAIL_PASS from your original .env file.
 * * For Gmail, you may need to generate an "App Password" if you have 2-Factor Authentication enabled.
 * Go to your Google Account -> Security -> App Passwords.
 */

define('MAIL_HOST', 'smtp.gmail.com');
define('MAIL_USERNAME', 'rihankhan441@gmail.com'); 
define('MAIL_PASSWORD', 'hckg jgqi wjcx phgp');   
define('MAIL_SMTP_SECURE', 'tls');             
define('MAIL_PORT', 587);                      


define('MAIL_FROM_ADDRESS', 'rihankhan441@gmail.com');
define('MAIL_FROM_NAME', 'Dubai POS');

// The base URL of your frontend application for generating reset links
define('FRONTEND_URL', 'http://localhost:5173'); 

?>
