const AdminUser = require('../models/adminUser');
const AuditTrail = require('../models/auditTrail');
const jwt = require('jsonwebtoken');

const moment = require('moment-timezone');

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Username and password are required'
            });
        }

        const user = await AdminUser.findOne({ where: { username } });
        
        if (!user) {
            const timeZone = process.env.TZ || 'UTC';
            await AuditTrail.create({
                action: 'LOGIN_FAILED',
                resource: 'AUTH',
                ipAddress: req.ip,
                details: {
                    username,
                    reason: 'User not found',
                    timestamp: moment.tz(new Date(), timeZone).format('YYYY-MM-DD HH:mm:ss.SSS Z')
                }
            });

            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid username or password'
            });
        }

        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            const timeZone = process.env.TZ || 'UTC';
            await AuditTrail.create({
                action: 'LOGIN_FAILED',
                resource: 'AUTH',
                ipAddress: req.ip,
                details: {
                    username,
                    reason: 'Invalid password',
                    timestamp: moment.tz(new Date(), timeZone).format('YYYY-MM-DD HH:mm:ss.SSS Z')
                }
            });

            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid username or password'
            });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const timeZone = process.env.TZ || 'UTC';
        await AuditTrail.create({
            action: 'LOGIN_SUCCESS',
            resource: 'AUTH',
            ipAddress: req.ip,
            details: {
                timestamp: moment.tz(new Date(), timeZone).format('YYYY-MM-DD HH:mm:ss.SSS Z')
            }
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Login failed due to server error'
        });
    }
};

const logout = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided'
            });
        }

        res.json({
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Logout failed'
        });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid authorization header'
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided'
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await AdminUser.findByPk(decoded.id);
            
            if (!user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'User no longer exists'
                });
            }

            res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        } catch (error) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            });
        }
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not get user information'
        });
    }
};

module.exports = {
    login,
    logout,
    getCurrentUser
};