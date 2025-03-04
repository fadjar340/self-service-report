const express = require('express');
const axios = require('axios');
const router = express.Router();

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

module.exports = router;