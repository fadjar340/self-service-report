import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './components/Login';
import AdminDatabases from './components/AdminDatabases';
import UserQueries from './components/UserQueries';
import './styles.css';

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
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/admin" component={AdminDatabases} />
          <Route path="/" component={UserQueries} />
        </Switch>
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