const jwt = require('jsonwebtoken');
const AdminUser = require('../src/models/adminUser');

const secret = process.env.JWT_SECRET;

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided'
            });
        }

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token format'
            });
        }

        const token = authHeader.split(' ')[1];
        
        try {
            const decoded = jwt.verify(token, secret);
            const user = await AdminUser.findByPk(decoded.id);
            
            if (!user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'User not found'
                });
            }

            req.user = user;
            next();
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Token expired'
                });
            }
            
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token'
            });
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Server Error',
            message: 'Error verifying user'
        });
    }
};

module.exports = { authenticateToken };
