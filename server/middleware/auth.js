const jwt = require('jsonwebtoken');
const db = require('../services/db');

const authenticateJWT = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
  if (!token) {
    return res.status(401).json({
        "success": false,
        "message": 'Acess token is required'
      });
  }

  try {
    // Verify and decode the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { user_name, authorities } = decoded;

    // Check if the user is an admin in the local database
    const isUserAdmin = await db.isAdmin(user_name);

    if (isUserAdmin) {
      // Attach admin role to the request object
      req.user = { username: user_name, role: 'admin' };
    } else {
      // Redirect non-admin users to the OAuth service
      return res.status(403).json({
        "success": false,
        "message": 'Acess denied!. Redirect to OAuth service...'
      });
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(403).json({
        "success": false,
        "message": 'Invalid or expired token'
      });
  }
};

module.exports = authenticateJWT;