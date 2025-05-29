import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import AuthLayout from '@/components/AuthLayout';
import DashboardPage from '@/pages/DashboardPage';
import NewSalePage from '@/pages/NewSalePage';
import UpdateSalePage from '@/pages/UpdateSalePage';
import SalesHistoryPage from '@/pages/SalesHistoryPage';
import BankRegisterPage from '@/pages/BankRegisterPage';
import CashRegisterPage from '@/pages/CashRegisterPage';
import VendorsPage from '@/pages/VendorsPage';
import VendorTransactionsPage from '@/pages/VendorTransactionsPage';
import ExpensesPage from '@/pages/ExpensesPage';
import EmployeesPage from '@/pages/EmployeesPage';
import PayrollPage from '@/pages/PayrollPage';
import AuditLogPage from '@/pages/AuditLogPage';
import UsersPage from '@/pages/UsersPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import SummaryPage from '@/pages/SummaryPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import UpdatePasswordPage from '@/pages/UpdatePasswordPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ProtectedRoutes } from '@/routes/protectedRoutes';

const AppContent = () => {
  const location = useLocation();
  const isAuthRoute = ['/login', '/signup', '/reset-password', '/update-password/:resetToken'].some(
    path => location.pathname === path || (path.includes(':') && new RegExp(path.replace(':resetToken', '.+')).test(location.pathname))
  );

  if (isAuthRoute) {
    return (
      <AuthLayout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/update-password/:resetToken" element={<UpdatePasswordPage />} />
        </Routes>
      </AuthLayout>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/sale/new" element={<NewSalePage />} />
          <Route path="/sale/:id/edit" element={<UpdateSalePage />} />
          <Route path="/sales" element={<SalesHistoryPage />} />
          <Route path="/bank" element={<BankRegisterPage />} />
          <Route path="/cash" element={<CashRegisterPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/vendors/:vendorId/transactions" element={<VendorTransactionsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
        <Toaster />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;