const AdminUser = require('../models/adminUser');
const AuditTrail = require('../models/auditTrail');
const jwt = require('jsonwebtoken');

const createUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Username, password, and role are required'
            });
        }

        const existingUser = await AdminUser.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Username already exists'
            });
        }

        const user = await AdminUser.create({
            username,
            password,
            role
        });

        await AuditTrail.create({
            action: 'CREATE_USER',
            resource: 'USER',
            ipAddress: req.ip,
            details: {
                userId: user.id,
                username: user.username,
                role: user.role
            }
        });

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not create user'
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const user = await AdminUser.findByPk(id);
        if (!user) {
            return res.status(404).json({
                error: 'Not found',
                message: 'User not found'
            });
        }

        if (user.id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to update this user'
            });
        }

        // Explicitly include isActive in update fields if provided
        const updateFields = {
            ...updateData,
            isActive: updateData.isActive !== undefined ? updateData.isActive : user.isActive
        };

        // Remove password if not provided
        if (!updateFields.password) {
            delete updateFields.password;
        }

        await user.update(updateFields);

        // Reload the updated user to get fresh data
        const updatedUser = await AdminUser.findByPk(id); // Changed from User to AdminUser

        await AuditTrail.create({
            userId: req.user.id,
            action: 'UPDATE_USER',
            resource: 'USER',
            ipAddress: req.ip,
            details: {
                userId: updatedUser.id,
                username: updatedUser.username,
                role: updatedUser.role,
                isActive: updatedUser.isActive,
                changes: user.changed()
            }
        });

        res.json({
            message: 'User updated successfully',
            user: updatedUser.toSafeObject()
        });
    } catch (error) {
        console.error('Update user error:', error);
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

        await user.update({
            isDeleted: true,
            deletedBy: req.user.id,
            deletedAt: new Date()
        });

        await AuditTrail.create({
            action: 'DELETE_USER',
            resource: 'USER',
            ipAddress: req.ip,
            details: {
                userId: id,
                username: user.username,
                role: user.role
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

const getUsers = async (req, res) => {
    try {
        const users = await AdminUser.findAll({
            attributes: ['id', 'username', 'role', 'createdAt', 'isActive','isDeleted'],
            where: { isDeleted: false },
            order: [['id', 'ASC']],
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

module.exports = {
    createUser,
    updateUser,
    deleteUser,
    getUsers
};