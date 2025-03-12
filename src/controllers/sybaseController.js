const SybaseDatabase = require('../models/sybaseDatabase');
const AdminUser = require('../models/adminUser');
//const dbManager = require('../utils/dbManager');
const AuditTrail = require('../models/auditTrail');
const { authenticate, authorize } = require('./authController');
//const {} = require('../middleware/authMiddleware');

// Save a new database
const saveDatabase = async (req, res) => {
    try {
        const { conn_name, host, port, database_name, username, password, isActive } = req.body;

        // Create query
        const query = await SybaseDatabase.create({
            conn_name,
            host,
            port,
            database_name,
            username,
            password,
            updatedBy: req.user.id, // Set updatedBy to the authenticated user's ID
            updatedAt: new Date(), // Set updatedAt to the current timestamp
            isActive
        });

        res.status(201).json({
            message: 'Query saved successfully',
            query: query.toSafeObject()
        });
    } catch (error) {
        console.error('Save query error:', error);

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Server error',
            message: 'Could not save query'
        });
    }
};

// Update a saved database
const updateDatabase = async (req, res) => {
    try {
        const { conn_name } = req.params;

        // Find query
        const query = await SybaseDatabase.findByName(conn_name);
        if (!query) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Query not found'
            });
        }

        // Check ownership or admin role
        if (query.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to update this query'
            });
        }

        // Update query
        await query.update({
            ...req.body, // Include all fields from the request
            updatedBy: req.user.id, // Set updatedBy to the authenticated user's ID
            updatedAt: new Date(), // Set updatedAt to the current timestamp
            isActive: req.body.isActive // Set isActive to the value from the request
        });

        res.json({
            message: 'Query updated successfully',
            query: query.toSafeObject()
        });
    } catch (error) {
        console.error('Update query error:', error);

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Server error',
            message: 'Could not update query'
        });
    }
};

// Delete a saved database (logical deletion)
const deleteDatabase = async (req, res) => {
    try {
        const { conn_name } = req.params;

        // Find query
        const query = await SybaseDatabase.findByName(conn_name);
        if (!query) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Query not found'
            });
        }

        // Check ownership or admin role
        if (query.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to delete this query'
            });
        }

        // Perform logical deletion
        await query.update({
            isActive: false, // Set isActive to false
            deletedBy: req.user.id, // Set deletedBy to the authenticated user's ID
            deletedAt: new Date() // Set deletedAt to the current timestamp
        });

        res.json({
            message: 'Query deleted successfully'
        });
    } catch (error) {
        console.error('Delete query error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not delete query'
        });
    }
};

// Get all saved databases
const loadDatabases = async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;

        // Build the where clause for search (if provided)
        const where = {};
        if (search) {
            where.id = { [Op.like]: `%${search}%` };
        }

        // Fetch all databases with pagination
        const databases = await SybaseDatabase.findAll({
            limit: parseInt(limit),
            offset: (page - 1) * limit,
            include: [
                {
                    model: AdminUser,
                    as: 'creator',
                    attributes: ['username']
                },
                {
                    model: AdminUser,
                    as: 'updater',
                    attributes: ['username']
                },
                {
                    model: AdminUser,
                    as: 'deleter',
                    attributes: ['username']
                }
            ]
        });

        // Get the total count of databases (for pagination)
        const total = await SybaseDatabase.count({ where });

        res.json({
            databases: databases.map(db => db.toSafeObject()),
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Get databases error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not retrieve databases'
        });
    }
};



// Get a specific database
const getDatabase = async (req, res) => {
    try {
        const { conn_name } = req.params;


        const query = await SybaseDatabase.findByName(conn_name, {
            include: [
                {
                    model: AdminUser,
                    as: 'creator',
                    attributes: ['username']
                },
                {
                    model: AdminUser,
                    as: 'updater',
                    attributes: ['username']
                },
                {
                    model: AdminUser,
                    as: 'deleter',
                    attributes: ['username']
                }
            ]
        });

        if (!query) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Query not found'
            });
        }

        // Check access permission
        if (query.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to view this query'
            });
        }

        res.json(query.toSafeObject());
    } catch (error) {
        console.error('Get query error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not retrieve query'
        });
    }
};

module.exports = {
    saveDatabase,
    updateDatabase,
    deleteDatabase,
    loadDatabases,
    getDatabase
};