// components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // Check if the user is authenticated
  const isAuthenticated = localStorage.getItem('isAuthenticated'); // Example: Check localStorage

  if (!isAuthenticated) {
    // Redirect to the login page if not authenticated
    return <Navigate to="/login" replace />;
  }

  // Render the protected component if authenticated
  return children;
};

export default ProtectedRoute;