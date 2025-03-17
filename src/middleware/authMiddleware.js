const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token'
        });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Admin access required'
        });
    }
    next();
};

module.exports = {
    protect,
    isAdmin
};