<?php


define('DB_HOST', 'localhost');
define('DB_USER', 'root'); 
define('DB_PASS', '');     
define('DB_NAME', 'pos_dubai');


function connectDB() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

    if ($conn->connect_error) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database Connection Error: ' . $conn->connect_error
        ]);
        die();
    }

    return $conn;
}
?>