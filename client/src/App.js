import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './Login';
import AdminDatabases from './AdminDatabases';
import UserQueries from './UserQueries';
import './styles.css';

// ProtectedRoute Component
const ProtectedRoute = ({ element: Component, ...rest }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated'); // Check authentication status

  return (
      <Route
        {...rest}
        element={isAuthenticated ? <Component /> : <Navigate to="/login" />}
      />
  );
};

const App = () => {
  useEffect(() => {
    // Example: Global error handling for uncaught errors
    const handleGlobalError = (error) => {
      toast.error(`An unexpected error occurred: ${error.message}`);
    };

    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  return (
    <Router>
      <div className="container">
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <ProtectedRoute path="/admin" element={AdminDatabases} />
          <ProtectedRoute path="/user-queries" element={UserQueries} />

          {/* Redirect to login for unknown routes */}
          <Navigate to="/login" />
        </Routes>
      </div>

      {/* ToastContainer should be placed here, outside the main content but inside the Router */}
      <ToastContainer
        position="top-right"
        autoClose={5000} // Close after 5 seconds
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </Router>
  );
};

export default App;
