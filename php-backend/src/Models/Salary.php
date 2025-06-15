<?php
// FILE: ...\php-backend\src\Models\Salary.php

require_once __DIR__ . '/Employee.php';
require_once __DIR__ . '/Expense.php';

class Salary {
    private $conn;
    private $table_name = "salary_payments";

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Adds a salary payment, creates an expense, and updates the employee's balance.
     * @param array $data The salary payment data.
     * @return int The ID of the new salary payment record.
     */
    public function addSalaryPayment($data) {
        $this->conn->begin_transaction();
        try {
            $employee_model = new Employee($this->conn);
            $employee = $employee_model->findEmployeeById($data['employee_id']);
            if (!$employee) {
                throw new Exception("Employee not found or is inactive.");
            }

            // --- Simplified Balance Calculation ---
            $current_balance = (float)$employee['salary_balance'];
            $new_balance = $current_balance;

            switch ($data['type']) {
                case 'Extra Commission':
                case 'Recovery Award':
                    $new_balance += $data['amount'];
                    break;
                case 'Salary Payment':
                case 'Advance Salary':
                case 'Deduction':
                    $new_balance -= $data['amount'];
                    break;
            }
            
            // --- Direct Payment & Expense Logic (Unchanged) ---
            $is_direct_payment = in_array($data['type'], ['Salary Payment', 'Advance Salary']);
            $expense_id = null;

            if ($is_direct_payment) {
                if (empty($data['payment_method'])) {
                    throw new Exception('Payment method is required for this type of transaction.');
                }
                $expense_model = new Expense($this->conn);
                $expense_category = ($data['type'] === 'Salary Payment') ? 'Salaries' : 'Advances';
                $expense_id = $expense_model->recordExpense([
                    'date' => $data['date'] ?? date('Y-m-d H:i:s'),
                    'category' => $expense_category,
                    'description' => $data['description'],
                    'amount' => $data['amount'],
                    'payment_type' => $data['payment_method'],
                    'paid_to_id' => $data['employee_id'],
                    'paid_to_model' => 'Employee',
                ]);
            }

            // --- Insert the salary payment record ---
            $query = "INSERT INTO " . $this->table_name . " (employee_id, entry_date, type, amount, description, payment_method, expense_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->conn->prepare($query);
            $date = $data['date'] ?? date('Y-m-d H:i:s');
            $method = $is_direct_payment ? $data['payment_method'] : null;
            $stmt->bind_param("isssdii", $data['employee_id'], $date, $data['type'], $data['amount'], $data['description'], $method, $expense_id);
            $stmt->execute();
            $new_payment_id = $stmt->insert_id;
            $stmt->close();

            if (!$new_payment_id) {
                throw new Exception("Failed to create salary payment record.");
            }
            
            // --- Update Employee Record: Sync net salary and balance ---
            $db_update_data = [
                'salary_net' => $new_balance,
                'salary_balance' => $new_balance
            ];
            $employee_model->updateEmployee($data['employee_id'], $db_update_data);

            $this->conn->commit();
            return $new_payment_id;

        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }
    // In Salary.php...

/**
 * Gets the full payment history for a specific employee.
 * @param array $options Contains employeeId and date/type filters.
 * @return array The list of salary payment records.
 */
public function getEmployeeSalaryHistory($options) {
    $query = "SELECT * FROM " . $this->table_name . " WHERE employee_id = ?";
    $params = [$options['employee_id']];
    $types = "i";

    if (!empty($options['from'])) {
        $query .= " AND entry_date >= ?";
        $params[] = $options['from'];
        $types .= "s";
    }
    if (!empty($options['to'])) {
        $query .= " AND entry_date <= ?";
        $params[] = $options['to'];
        $types .= "s";
    }
    if (!empty($options['type'])) {
        $query .= " AND type = ?";
        $params[] = $options['type'];
        $types .= "s";
    }

    $query .= " ORDER BY entry_date DESC";

    $stmt = $this->conn->prepare($query);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    return $result;
}

/**
 * Gets a summary of payments grouped by type for an employee.
 * @param int $employeeId The ID of the employee.
 * @return array The summary of payments.
 */
public function getEmployeeSalarySummary($employeeId) {
    $employee_model = new Employee($this->conn);
    $employee = $employee_model->findEmployeeById($employeeId);

    if (!$employee) {
        throw new Exception("Employee not found.");
    }

    $query = "SELECT type, SUM(amount) as total FROM " . $this->table_name . " WHERE employee_id = ? GROUP BY type";
    $stmt = $this->conn->prepare($query);
    $stmt->bind_param("i", $employeeId);
    $stmt->execute();
    $summary_result = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $payments_summary = [];
    foreach ($summary_result as $row) {
        $payments_summary[$row['type']] = (float)$row['total'];
    }

    return [
        'employee' => [
            'name' => $employee['name'],
            'salary' => [
                'gross' => (float)$employee['salary_gross'],
                'net' => (float)$employee['salary_net'],
            ],
            'balance' => (float)$employee['salary_balance']
        ],
        'payments' => $payments_summary
    ];
}
}
?>