import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { isAdmin } from './services'; // Updated import path
import './styles.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Step 1: Authenticate and get the access token
      const tokenResponse = await axios.post('/auth/login', {
        username,
        password,
      });

      const accessToken = tokenResponse.data.access_token;

      // Step 2: Check if the user is an admin
      const role = tokenResponse.data.role; // Get role from response

      // Step 3: Store the token and role in localStorage
      localStorage.setItem('isAuthenticated', 'true'); // Set authentication status
      localStorage.setItem('token', accessToken);
      localStorage.setItem('role', role); // Store the role from response

      // Step 4: Redirect based on role
      if (role === 'admin') {
        navigate('/admin'); // Redirect to admin dashboard
      } else {
        navigate('/'); // Redirect to user dashboard
      }
    } catch (error) {
      toast.error('Invalid username or password');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
