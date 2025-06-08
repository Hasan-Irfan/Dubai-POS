<?php
// FILE: ...\php-backend\api\employees\update.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/Employee.php';
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

$employee_id = $data['id'] ?? null;
$update_payload = $data['updateData'] ?? null;

if (!$employee_id || !$update_payload) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Employee ID and updateData are required.']);
    exit();
}

try {
    $conn = connectDB();
    $employee_model = new Employee($conn);

    // Map the potentially nested/camelCase payload to our flat/snake_case database columns
    $db_update_data = [];
    foreach($update_payload as $key => $value) {
        switch ($key) {
            case 'name':
            case 'role':
            case 'status':
                $db_update_data[$key] = $value;
                break;
            case 'hireDate':
                $db_update_data['hire_date'] = $value;
                break;
            case 'contact':
                if (isset($value['phone'])) $db_update_data['phone'] = $value['phone'];
                if (isset($value['email'])) $db_update_data['email'] = $value['email'];
                if (isset($value['address'])) $db_update_data['address'] = $value['address'];
                break;
            case 'salary':
                if (isset($value['gross'])) $db_update_data['salary_gross'] = $value['gross'];
                if (isset($value['net'])) $db_update_data['salary_net'] = $value['net'];
                break;
        }
    }

    // Update the employee in the database
    $success = $employee_model->updateEmployee($employee_id, $db_update_data);

    if ($success) {
        // Fetch the complete, updated record
        $updated_employee_db = $employee_model->findEmployeeById($employee_id);
        // Format it for the response
        $formatted_employee = format_employee_response($updated_employee_db);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'employee' => $formatted_employee
        ]);
    } else {
        throw new Exception('Database update failed.');
    }

} catch (Exception $e) {
    http_response_code(500);
    if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
         http_response_code(409);
         echo json_encode(['success' => false, 'message' => 'An employee with this email already exists.']);
    } else {
         echo json_encode(['success' => false, 'message' => 'An error occurred during update: ' . $e->getMessage()]);
    }
}
?>