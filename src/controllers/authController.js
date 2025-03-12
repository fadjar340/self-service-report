const AdminUser = require('../models/adminUser');
const AuditTrail = require('../models/auditTrail');

// Login user
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Basic validation
        if (!username || !password) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Username and password are required'
            });
        }

        // Find user by username
        const user = await AdminUser.findOne({ where: { username } });
        
        if (!user) {
            // Log failed login attempt
            await AuditTrail.create({
                action: 'LOGIN_FAILED',
                resource: 'AUTH',
                ipAddress: req.ip,
                details: {
                    username,
                    reason: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });

            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid username or password'
            });
        }

        // Verify password using pgcrypto
        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            // Log failed login attempt
            await AuditTrail.create({
                action: 'LOGIN_FAILED',
                resource: 'AUTH',
                ipAddress: req.ip,
                details: {
                    username,
                    reason: 'Invalid password',
                    timestamp: new Date().toISOString()
                }
            });

            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid username or password'
            });
        }

        // Generate session data
        const sessionData = user.generateSession();

        // Store user data in session
        req.session.user = sessionData;
        await req.session.save();

        // Log successful login
        await AuditTrail.create({
            userId: user.id,
            action: 'LOGIN_SUCCESS',
            resource: 'AUTH',
            ipAddress: req.ip,
            details: {
                username: user.username,
                timestamp: new Date().toISOString()
            }
        });

        // Return user data
        res.json({
            message: 'Login successful',
            user: user.toSafeObject()
        });
    } catch (error) {
        console.error('Login error:', error);

        // Log error
        await AuditTrail.create({
            action: 'LOGIN_ERROR',
            resource: 'AUTH',
            ipAddress: req.ip,
            details: {
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });

        res.status(500).json({
            error: 'Server error',
            message: 'Login failed due to server error'
        });
    }
};

// Logout user
const logout = async (req, res) => {
    try {
        const userId = req.session?.user?.id;

        // Log logout action if user was logged in
        if (userId) {
            await AuditTrail.create({
                userId,
                action: 'LOGOUT',
                resource: 'AUTH',
                ipAddress: req.ip,
                details: {
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
                return res.status(500).json({
                    error: 'Logout failed',
                    message: 'Could not end session'
                });
            }

            // Clear session cookie
            res.clearCookie('sessionId');
            
            res.json({
                message: 'Logout successful'
            });
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Logout failed'
        });
    }
};

// Get current user
const getCurrentUser = async (req, res) => {
    try {
         // Debug: Log session data
        console.log('Session data:', req.session);
  
        // Validate session and user
        if (!req.session || !req.session.user || !req.session.user.id) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Not logged in or session is invalid'
            });
        }

        // Get fresh user data from the database
        const user = await AdminUser.findByPk(req.session.user.id, {
            attributes: ['id', 'username', 'role']
        });
        if (!user) {
            // Clear invalid session
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destruction error:', err);
                }
            });
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not found in the database'
            });
        }

        // Return safe user object
        res.json({
            user
        });
        
    } catch (error) {
        console.error('Get current user error:', error);

        // Handle Sequelize-specific errors
        if (error.name === 'SequelizeDatabaseError') {
            return res.status(500).json({
                error: 'Database error',
                message: 'An error occurred while fetching user data'
            });
        }

        // Generic server error
        res.status(500).json({
            error: 'Server error',
            message: 'Could not get user information'
        });
    }
};


// Get all users (admin only)
const getUsers = async (req, res) => {
    try {
        const users = await AdminUser.findAll({
            attributes: ['id', 'username', 'role', 'createdAt', 'updatedAt']
        });

        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not get users'
        });
    }
};

// Create new user (admin only)
const createUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        const user = await AdminUser.create({
            username,
            password,
            role
        });

        // Log user creation
        await AuditTrail.create({
            userId: req.user.id,
            action: 'CREATE_USER',
            resource: 'USER',
            ipAddress: req.ip,
            details: {
                createdUserId: user.id,
                username: user.username,
                role: user.role
            }
        });

        res.status(201).json({
            message: 'User created successfully',
            user: user.toSafeObject()
        });
    } catch (error) {
        console.error('Create user error:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Username already exists'
            });
        }

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Server error',
            message: 'Could not create user'
        });
    }
};

// Update user (admin only)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, role } = req.body;

        const user = await AdminUser.findByPk(id);
        if (!user) {
            return res.status(404).json({
                error: 'Not found',
                message: 'User not found'
            });
        }

        // Update user fields
        if (username) user.username = username;
        if (password) user.password = password;
        if (role) user.role = role;

        await user.save();

        // Log user update
        await AuditTrail.create({
            userId: req.user.id,
            action: 'UPDATE_USER',
            resource: 'USER',
            ipAddress: req.ip,
            details: {
                updatedUserId: user.id,
                username: user.username,
                role: user.role,
                changes: user.changed()
            }
        });

        res.json({
            message: 'User updated successfully',
            user: user.toSafeObject()
        });
    } catch (error) {
        console.error('Update user error:', error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Username already exists'
            });
        }

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Server error',
            message: 'Could not update user'
        });
    }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await AdminUser.findByPk(id);
        if (!user) {
            return res.status(404).json({
                error: 'Not found',
                message: 'User not found'
            });
        }

        // Prevent deleting the last admin
        const adminCount = await AdminUser.count({ where: { role: 'admin' } });
        if (adminCount === 1 && user.role === 'admin') {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Cannot delete the last admin user'
            });
        }

        // Store user info for audit log
        const userInfo = user.toSafeObject();

        await user.destroy();

        // Log user deletion
        await AuditTrail.create({
            userId: req.user.id,
            action: 'DELETE_USER',
            resource: 'USER',
            ipAddress: req.ip,
            details: {
                deletedUserId: id,
                username: userInfo.username,
                role: userInfo.role
            }
        });

        res.json({
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not delete user'
        });
    }
};

module.exports = {
    login,
    logout,
    getCurrentUser,
    getUsers,
    createUser,
    updateUser,
    deleteUser
};
