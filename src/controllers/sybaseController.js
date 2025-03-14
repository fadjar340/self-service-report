const SybaseDatabase = require('../models/sybaseDatabase');
const AdminUser = require('../models/adminUser');
//const dbManager = require('../utils/dbManager');
const AuditTrail = require('../models/auditTrail');
const { authenticate, authorize } = require('./authController');
const { Op } = require('sequelize');
//const {} = require('../middleware/authMiddleware');

// Save a new database
const saveDatabase = async (req, res) => {
    try {
        const { id, conn_name, host, port, database_name, username, password, isActive, } = req.body;

        // Create query
        const query = await SybaseDatabase.create({
            id,
            conn_name,
            host,
            port,
            database_name,
            username,
            password,
            createdBy: req.user.id, // Set updatedBy to the authenticated user's ID
            createdAt: new Date(), // Set updatedAt to the current timestamp
            isActive,
            isDeleted: false
            
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
        const { id } = req.params;

        // Find query
        const query = await SybaseDatabase.findById(id);
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
            isDeleted: false
        },
        {
          where: { id: req.params.id },
          returning: true, // For PostgreSQL
          plain: true
        }
    );


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
        // Decode the connection name and trim whitespace
        const id =(req.params.id);
        
        if (!id) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Connection name is required'
            });
        }

        // Find the database connection with case-insensitive search
        const database = await SybaseDatabase.findOne({
            where: { id: id }          
        });

        if (!database) {
            return res.status(404).json({
                error: 'Not Found',
                message: `Database connection '${conn_name}' not found`
            });
        }

        // Verify ownership or admin privileges
        if (database.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to delete this connection'
            });
        }

        // Perform logical deletion with transaction
        const result = await SybaseDatabase.sequelize.transaction(async (t) => {
            return await database.update({
                isActive: false,
                deletedAt: new Date(),
                deletedBy: req.user.id,
                isDeleted: true
            }, { transaction: t });
        });

        res.json({
            message: 'Database connection deleted successfully',
            details: {
                connectionName: result.conn_name,
                deletedAt: result.deletedAt,
                deletedBy: result.deletedBy,
                isDeleted: result.isDeleted
            }
        });

    } catch (error) {
        console.error('Delete Database Error:', {
            error: error.message,
            connection: req.params.conn_name,
            user: req.user.id,
            timestamp: new Date().toISOString()
        });
        
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete database connection',
            systemMessage: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const loadDatabases = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, sortBy = 'id', order = 'ASC'} = req.query;

        // Base where clause - include both false and NULL values
        const where = {
            [Op.or]: [
                { isDeleted: false },
                { isDeleted: null }
            ]
        };

        // Add search condition if provided
        if (search) {
            where[Op.and] = [
                { 
                    [Op.or]: [
                        { id: { [Op.like]: `%${search}%` } },
                        { conn_name: { [Op.like]: `%${search}%` } },
                        { host: { [Op.like]: `%${search}%` } }
                    ]
                },
                {
                    [Op.or]: [
                        { isDeleted: false },
                        { isDeleted: null }
                    ]
                }
            ];
        }

        const orderClause = [[sortBy, order.toUpperCase()]];

        // Fetch paginated databases with associations
        const databases = await SybaseDatabase.findAll({
            where, // Include the where clause here
            limit: parseInt(limit),
            offset: (page - 1) * limit,
            order: orderClause,
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

        // Get the total count with the same filters
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
        const { id } = req.params;


        const query = await SybaseDatabase.findById(id, {
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