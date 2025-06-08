<?php
// FILE: ...\php-backend\api\employees\create.php (REVISED)

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
// ... (all other headers remain the same)

require_once '../../src/Middleware/authChecker.php';
require_once '../../config/database.php';
require_once '../../src/Models/Employee.php';
require_once '../../src/Utils/formatters.php'; // Include our new formatter

// --- Authorization ---
$user_data = verify_jwt_and_get_user();
if ($user_data['role'] !== 'admin' && $user_data['role'] !== 'superAdmin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

// --- Logic ---
$data = json_decode(file_get_contents("php://input"), true);

// Expect the payload to be nested under "employeeData", like the original API
$employee_payload = $data['employeeData'] ?? null;

if (!$employee_payload || !isset($employee_payload['name']) || !isset($employee_payload['contact']['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required employee fields in employeeData.']);
    exit();
}

try {
    $conn = connectDB();
    $employee_model = new Employee($conn);

    // Map the nested payload to the flat structure our model's create method expects
    $employee_to_create = [
        'name' => $employee_payload['name'],
        'email' => $employee_payload['contact']['email'],
        'phone' => $employee_payload['contact']['phone'] ?? null,
        'address' => $employee_payload['contact']['address'] ?? null,
        'role' => $employee_payload['role'],
        'hire_date' => $employee_payload['hireDate'], // Note the case change
        'salary_gross' => $employee_payload['salary'], // Original API used a single salary field
        'salary_net' => $employee_payload['salary']   // Default net to gross
    ];

    $new_employee_id = $employee_model->createEmployee($employee_to_create);

    if ($new_employee_id) {
        $new_employee_db = $employee_model->findEmployeeById($new_employee_id);
        // Use the formatter to create the correct response structure
        $formatted_employee = format_employee_response($new_employee_db);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'employee' => $formatted_employee // Send back the correctly formatted object
        ]);
    } else {
        throw new Exception('Failed to create employee.');
    }

} catch (Exception $e) {
    // ... (error handling remains the same)
    http_response_code(500);
    if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
         http_response_code(409);
         echo json_encode(['success' => false, 'message' => 'An employee with this email already exists.']);
    } else {
         echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
    }
}
?>