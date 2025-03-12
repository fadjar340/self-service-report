const express = require('express');
const path = require('path'); // Import the path module
const axios = require('axios');
const { Pool } = require('pg');
const router = express.Router();

// PostgreSQL configuration
const pgPool = new Pool({
  user: process.env.PG_USER, // Use APP_PG_USER for application database
  host: process.env.PG_HOST, // Use APP_PG_HOST for application database
  database: process.env.PG_DATABASE, // Use APP_PG_DATABASE for application database
  password: process.env.PG_PASSWORD, // Use APP_PG_PASSWORD for application database
  port: process.env.PG_PORT, // Use APP_PG_PORT for application database
});

// Proxy OAuth2 token request
router.post('/oauth/token', async (req, res) => {
  const { username, password } = req.body;

  try {
    const response = await axios.post(process.env.OAUTH2_TOKEN_URL, {
      client_id: process.env.OAUTH2_CLIENT_ID,
      client_secret: process.env.OAUTH2_CLIENT_SECRET,
      grant_type: 'password',
      username,
      password,
      scope: 'read write',
    });

    // Forward the OAuth2 token response
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(401).json({
        "success": false,
        "message": 'Authentication failed'
      });
  }
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html')); // Serve the React app
});

// Route for user login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const query = 'SELECT role, password FROM admin_users WHERE username = $1'; // Check username and password
    const values = [username]; 
    const result = await pgPool.query(query, values);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password); // Compare hashed password
      if (isPasswordValid) {
        const role = user.role;

        // Generate JWT token after successful authentication
        const token = jwt.sign({ user_name: username, authorities: role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        return res.json({
          success: true,
          message: 'Login successful',
          role: role,
          token: token // Send the token back to the client
        });
      }
    } else {
      // If no user found, check with OAuth2
      const response = await axios.post(process.env.OAUTH2_TOKEN_URL, {
        client_id: process.env.OAUTH2_CLIENT_ID,
        client_secret: process.env.OAUTH2_CLIENT_SECRET,
        grant_type: 'password',
        username,
        password,
        scope: 'read write',
      });
      return res.json({
        success: true,
        message: 'Login successful via OAuth',
        role: 'user',
        token: response.data.access_token
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
