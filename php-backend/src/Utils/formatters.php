<?php
// FILE: ...\php-backend\src\Utils\formatters.php

/**
 * Formats a flat employee array from the database into the nested structure expected by the frontend.
 * @param array $employee_from_db A flat associative array from a database row.
 * @return array The formatted employee data.
 */
function format_employee_response($employee_from_db) {
    if (!$employee_from_db) {
        return null;
    }

    return [
        'id' => $employee_from_db['id'],
        'name' => $employee_from_db['name'],
        'contact' => [
            'phone' => $employee_from_db['phone'],
            'email' => $employee_from_db['email'],
            'address' => $employee_from_db['address']
        ],
        'role' => $employee_from_db['role'],
        'hireDate' => $employee_from_db['hire_date'], 
        'status' => $employee_from_db['status'],
        'salary' => [
            'gross' => (float)$employee_from_db['salary_gross'],
            'net' => (float)$employee_from_db['salary_net']
        ],
        'salaryBalance' => (float)$employee_from_db['salary_balance'], 
        'createdAt' => $employee_from_db['created_at'], 
        'updatedAt' => $employee_from_db['updated_at']  
    ];
}
/**
 * Formats a flat vendor array from the database into the nested structure expected by the frontend.
 * @param array $vendor_from_db A flat associative array from a database row.
 * @return array The formatted vendor data.
 */
/**
 * Formats a flat vendor array from the database into the nested structure expected by the frontend.
 * @param array $vendor_from_db A flat associative array from a database row.
 * @return array The formatted vendor data.
 */
function format_vendor_response($vendor_from_db) {
    if (!$vendor_from_db) {
        return null;
    }

    return [
        'id' => (int)$vendor_from_db['id'],
        'name' => $vendor_from_db['name'],
        'contact' => [
            'phone' => $vendor_from_db['phone'],
            'email' => $vendor_from_db['email'],
            'address' => $vendor_from_db['address']
        ],
        'openingBalance' => (float)$vendor_from_db['opening_balance'],
        'status' => $vendor_from_db['status'],
        'createdAt' => $vendor_from_db['created_at'],
        'updatedAt' => $vendor_from_db['updated_at']
    ];
}
/**
 * Formats invoice data into the nested structure expected by the frontend.
 * @param array $invoice_db The main invoice data from the DB.
 * @param array $items_db The list of item rows from the DB.
 * @param array $payments_db The list of payment rows from the DB.
 * @return array The fully formatted invoice object.
 */
function format_invoice_response($invoice_db, $items_db = [], $payments_db = []) {
    if (!$invoice_db) {
        return null;
    }

    $items = [];
    foreach ($items_db as $item) {
        $items[] = [
            'description' => $item['description'],
            'quantity' => (int)$item['quantity'],
            'unitPrice' => (float)$item['unit_price'],
            'costPrice' => (float)$item['cost_price'],
            'vatAmount' => (float)$item['vat_amount'],
            'lineTotal' => (float)$item['line_total'],
        ];
    }

    $payments = [];
    foreach ($payments_db as $payment) {
        $payments[] = [
            'id' => $payment['id'],
            'date' => $payment['payment_date'],
            'amount' => (float)$payment['amount'],
            'method' => $payment['method'],
            'account' => $payment['account']
        ];
    }

    return [
        'id' => (int)$invoice_db['id'],
        'invoiceNumber' => $invoice_db['invoice_number'],
        'date' => $invoice_db['invoice_date'],
        'customerName' => $invoice_db['customer_name'],
        'salesmanId' => (int)$invoice_db['salesman_id'],
        'items' => $items,
        'totals' => [
            'subTotal' => (float)$invoice_db['sub_total'],
            'totalVat' => (float)$invoice_db['total_vat'],
            'grandTotal' => (float)$invoice_db['grand_total'],
            'totalCost' => (float)$invoice_db['total_cost'],
            'totalProfit' => (float)$invoice_db['total_profit']
        ],
        'payments' => $payments,
        'status' => $invoice_db['status'],
        'commission' => [
            'eligible' => (bool)$invoice_db['commission_eligible'],
            'rate' => (float)$invoice_db['commission_rate_pct'],
            'total' => (float)$invoice_db['commission_total'],
            'paid' => (float)$invoice_db['commission_paid'],
            'balanceDue' => (float)($invoice_db['commission_total'] - $invoice_db['commission_paid'])
        ],
        'deletedAt' => $invoice_db['deleted_at'],
        'createdAt' => $invoice_db['created_at'],
        'updatedAt' => $invoice_db['updated_at']
    ];
}
/**
 * Formats a cash register entry from the database.
 * @param array $entry_from_db A flat associative array from a database row.
 * @return array The formatted cash entry data.
 */
function format_cash_entry_response($entry_from_db) {
    if (!$entry_from_db) {
        return null;
    }

    return [
        'id' => (int)$entry_from_db['id'],
        'date' => $entry_from_db['entry_date'],
        'type' => $entry_from_db['type'],
        'reference' => $entry_from_db['reference'],
        'amount' => (float)$entry_from_db['amount'],
        'balance' => (float)$entry_from_db['balance'],
        'status' => $entry_from_db['status'],
        'createdAt' => $entry_from_db['created_at'],
        'updatedAt' => $entry_from_db['updated_at']
    ];
}
/**
 * Formats a bank transaction entry from the database.
 * @param array $entry_from_db A flat associative array from a database row.
 * @return array The formatted bank transaction data.
 */
function format_bank_transaction_response($entry_from_db) {
    if (!$entry_from_db) {
        return null;
    }

    return [
        'id' => (int)$entry_from_db['id'],
        'date' => $entry_from_db['entry_date'],
        'type' => $entry_from_db['type'],
        'method' => $entry_from_db['method'],
        'reference' => $entry_from_db['reference'],
        'amount' => (float)$entry_from_db['amount'],
        'balance' => (float)$entry_from_db['balance'],
        'status' => $entry_from_db['status'],
        'createdAt' => $entry_from_db['created_at'],
        'updatedAt' => $entry_from_db['updated_at']
    ];
}
/**
 * Formats an expense record from the database.
 * @param array $expense_from_db A flat associative array from a database row.
 * @return array The formatted expense data.
 */
function format_expense_response($expense_from_db) {
    if (!$expense_from_db) {
        return null;
    }

    return [
        'id' => (int)$expense_from_db['id'],
        'date' => $expense_from_db['entry_date'],
        'category' => $expense_from_db['category'],
        'description' => $expense_from_db['description'],
        'amount' => (float)$expense_from_db['amount'],
        'paymentType' => $expense_from_db['payment_type'],
        'paidTo' => $expense_from_db['paid_to_id'] ? (int)$expense_from_db['paid_to_id'] : null,
        'paidToModel' => $expense_from_db['paid_to_model'],
        'ledgerEntryId' => $expense_from_db['ledger_entry_id'] ? (int)$expense_from_db['ledger_entry_id'] : null,
        'ledgerEntryModel' => $expense_from_db['ledger_entry_model'],
        'status' => $expense_from_db['status'],
        'createdAt' => $expense_from_db['created_at'],
        'updatedAt' => $expense_from_db['updated_at']
    ];
}
/**
 * Formats a vendor transaction record from the database.
 * @param array $txn_from_db A flat associative array from a database row.
 * @return array The formatted vendor transaction data.
 */
function format_vendor_transaction_response($txn_from_db) {
    if (!$txn_from_db) {
        return null;
    }

    return [
        'id' => (int)$txn_from_db['id'],
        'vendorId' => (int)$txn_from_db['vendor_id'],
        'type' => $txn_from_db['type'],
        'description' => $txn_from_db['description'],
        'amount' => (float)$txn_from_db['amount'],
        'balance' => (float)$txn_from_db['balance'],
        'date' => $txn_from_db['entry_date'],
        'method' => $txn_from_db['method'],
        'ledgerEntryId' => $txn_from_db['ledger_entry_id'] ? (int)$txn_from_db['ledger_entry_id'] : null,
        'ledgerEntryModel' => $txn_from_db['ledger_entry_model'],
        'status' => $txn_from_db['status'],
        'createdAt' => $txn_from_db['created_at'],
        'updatedAt' => $txn_from_db['updated_at']
    ];
}
?>