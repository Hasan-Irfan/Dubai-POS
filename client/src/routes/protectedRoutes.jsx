import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useJwtVerifyQuery, useLogoutMutation } from '@/api/authApi';

// Define route access by role
const ROLE_ROUTES = {
  salesman: ['/sale/new', '/sales', '/profile'],
  employee: ['*'], // All routes
  admin: ['*'],
  superAdmin: ['*']
};

export const ProtectedRoutes = () => {
  const user = localStorage.getItem("username");
  const role = localStorage.getItem("role");
  const location = useLocation();
  const { data, isLoading, error } = useJwtVerifyQuery();
  const [logout] = useLogoutMutation();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    // If there's an error and it's a 401, the baseQueryWithReauth will handle the refresh
    // For other errors, log out
    if (error.status !== 401) {
      logout()
        .unwrap()
        .catch(console.error); // Handle any logout errors
      return <Navigate to="/login" />;
    }
    return <div>Loading...</div>;
  }

  // Check if user has access to the current route
  const allowedRoutes = ROLE_ROUTES[role] || [];
  const currentPath = location.pathname;
  const hasAccess = allowedRoutes.includes('*') || 
                    allowedRoutes.includes(currentPath) || 
                    allowedRoutes.some(route => currentPath.startsWith(route));

  if (!hasAccess) {
    // Redirect to the first allowed route for their role
    const defaultRoute = ROLE_ROUTES[role]?.[0] || '/';
    return <Navigate to={defaultRoute} replace />;
  }

  return data?.success ? <Outlet /> : <Navigate to="/login" />;
};