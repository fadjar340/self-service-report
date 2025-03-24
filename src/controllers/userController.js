const AdminUser = require('../models/adminUser');
const AuditTrail = require('../models/auditTrail');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');

const createUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        const timeZone = process.env.TZ || 'UTC';
        

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
            user_name: req.user.username,
            action: 'CREATE_USER',
            resource: 'USER',
            ipAddress: req.ip,
            details: {
                userId: user.username,
                username: user.username,
                role: user.role,
                cretaedAt: moment.tz(new Date(), timeZone).format('YYYY-MM-DD HH:mm:ss.SSS Z')
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

        const timeZone = process.env.TZ || 'UTC';

        // Remove password if not provided
        if (!updateData.password) {
            delete updateData.password;
        }

        // Explicitly include isActive in update fields if provided
        const updateFields = {
            ...updateData,
            isActive: updateData.isActive !== undefined ? updateData.isActive : user.isActive,
            updatedAt: moment.tz(new Date(), timeZone).format('YYYY-MM-DD HH:mm:ss.SSS Z'),
            updatedBy: user.username
        };



        await user.update(updateFields);

        // Reload the updated user to get fresh data
        const updatedUser = await AdminUser.findByPk(id); // Changed from User to AdminUser

        await AuditTrail.create({
            user_name: user.username,
            action: 'UPDATE_USER',
            resource: 'USER',
            ipAddress: req.ip,
            details: {
                username: updatedUser.username,
                role: updatedUser.role,
                isActive: updatedUser.isActive,
                updatedAt: updatedUser.updatedAt,
                updatedBy: updatedUser.updatedBy,
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

        const timeZone = process.env.TZ || 'UTC';
    
        await user.update({
            isDeleted: true,
            deletedBy: req.user.username,
            deletedAt: moment.tz(new Date(), timeZone).format('YYYY-MM-DD HH:mm:ss.SSS Z')
        });

        await AuditTrail.create({
            user_name: req.user.username,
            action: 'DELETE_USER',
            resource: 'USER',
            ipAddress: req.ip,
            details: {
                userId: user.id,
                username: user.username,
                role: user.role,
                isDeleted: user.isDeleted,
                deletedBy: user.deletedBy,
                deletedAt: user.updatedAt
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