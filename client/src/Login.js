import React, { useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import { isAdmin } from '../services/db'; // Import isAdmin function
import './styles.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const history = useHistory();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Step 1: Authenticate and get the access token
      const tokenResponse = await axios.post('/auth/oauth/token', {
        username,
        password,
      });

      const accessToken = tokenResponse.data.access_token;

      // Step 2: Check if the user is an admin
      const adminCheck = await isAdmin(username);

      // Step 3: Store the token and role in localStorage
      localStorage.setItem('token', accessToken);
      localStorage.setItem('role', adminCheck ? 'admin' : 'user');

      // Step 4: Redirect based on role
      if (adminCheck) {
        history.push('/admin'); // Redirect to admin dashboard
      } else {
        history.push('/'); // Redirect to user dashboard
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