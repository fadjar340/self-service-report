const DatabaseQuery = require('../models/databaseQuery');
const SybaseDatabase = require('../models/sybaseDatabase');
const dbManager = require('../utils/dbManager');
const AuditTrail = require('../models/auditTrail');
const { authenticate, authorize } = require('./authController');
const { authMiddleware, isAdmin } = require('../middleware/authMiddleware');
const { Connection, Request } = require('tedious'); // Use tedious for Sybase
//const SybaseDatabase = require('../models/sybaseDatabase');

// Execute a saved query
const executeQuery = async (req, res) => {
    try {
        const { queryId } = req.params;
        const { databaseId } = req.body;

        // Get query details
        const query = await DatabaseQuery.findByPk(queryId);
        if (!query) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Query not found'
            });
        }

        // Get database details
        const database = await SybaseDatabase.findByPk(databaseId);
        if (!database) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Database not found'
            });
        }

        // Validate query
        try {
            dbManager.validateQuery(query.queryText);
        } catch (error) {
            return res.status(400).json({
                error: 'Invalid query',
                message: error.message
            });
        }

        // Execute query
        const result = await dbManager.executeQuery(
            database.getConnectionConfig(),
            query.queryText,
            req.user.id,
            { ip: req.ip }
        );

        res.json({
            success: true,
            data: result.data,
            metadata: {
                rowCount: result.rowCount,
                duration: result.duration,
                query: query.name,
                database: database.name
            }
        });
    } catch (error) {
        console.error('Execute query error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not execute query'
        });
    }
};

// Execute an ad-hoc query
const executeAdHocQuery = async (req, res) => {
    try {
        const { databaseId, queryText } = req.body;

        // Get database details
        const database = await SybaseDatabase.findByPk(databaseId);
        if (!database) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Database not found'
            });
        }

        // Validate query
        try {
            dbManager.validateQuery(queryText);
        } catch (error) {
            return res.status(400).json({
                error: 'Invalid query',
                message: error.message
            });
        }

        // Execute query
        const result = await dbManager.executeQuery(
            database.getConnectionConfig(),
            queryText,
            req.user.id,
            { ip: req.ip }
        );

        res.json({
            success: true,
            data: result.data,
            metadata: {
                rowCount: result.rowCount,
                duration: result.duration,
                database: database.name
            }
        });
    } catch (error) {
        console.error('Execute ad-hoc query error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not execute query'
        });
    }
};

// Save a new query
const saveQuery = async (req, res) => {
    try {
        const { name, description, queryText } = req.body;

        // Validate query
        try {
            dbManager.validateQuery(queryText);
        } catch (error) {
            return res.status(400).json({
                error: 'Invalid query',
                message: error.message
            });
        }

        // Create query
        const query = await DatabaseQuery.create({
            name,
            description,
            queryText,
            createdBy: req.user.id,
            updatedBy: req.user.id,
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

// Update a saved query
const updateQuery = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, queryText } = req.body;

        // Find query
        const query = await DatabaseQuery.findByPk(id);
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

        // Validate query if provided
        if (queryText) {
            try {
                dbManager.validateQuery(queryText);
            } catch (error) {
                return res.status(400).json({
                    error: 'Invalid query',
                    message: error.message
                });
            }
        }

        // Update query
        await query.update({
            name: name || query.name,
            description: description || query.description,
            queryText: queryText || query.queryText,
            updatedBy: req.user.id
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

// Delete a saved query
const deleteQuery = async (req, res) => {
    try {
        const { id } = req.params;

        // Find query
        const query = await DatabaseQuery.findByPk(id);
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

        // Delete query
        await query.destroy();

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

// Get all saved queries
const getQueries = async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;

        const queries = await DatabaseQuery.searchQueries({
            search,
            userId: req.user.role === 'admin' ? null : req.user.id,
            limit: parseInt(limit),
            offset: (page - 1) * limit
        });

        res.json({
            queries: queries.rows.map(query => query.toSafeObject()),
            total: queries.count,
            page: parseInt(page),
            totalPages: Math.ceil(queries.count / limit)
        });
    } catch (error) {
        console.error('Get queries error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not retrieve queries'
        });
    }
};

// Get a specific query
const getQuery = async (req, res) => {
    try {
        const { id } = req.params;

        const query = await DatabaseQuery.findByPk(id, {
            include: [
                {
                    model: req.app.get('models').AdminUser,
                    as: 'creator',
                    attributes: ['username']
                },
                {
                    model: req.app.get('models').AdminUser,
                    as: 'updater',
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

const testConnection = async (req, res) => {
    try {
        const { conn_name, host, port, database_name, username, password } = req.body;

        // Validate input
        if (!conn_name || !host || !port || !database_name || !username || !password) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'All fields are required'
            });
        }

        // Test the connection
        const config = {
            conn_name,
            host,
            port,
            database_name,
            username,
            password
        };

        const isConnected = await SybaseDatabase.testConnection(config);

        if (isConnected) {
            res.status(200).json({
                message: 'Connection test successful'
            });
        } else {
            res.status(500).json({
                error: 'Connection error',
                message: 'Failed to connect to Sybase'
            });
        }
    } catch (error) {
        console.error('Test connection error:', error);
        res.status(500).json({
            error: 'Server error',
            message: error.message
        });
    }
};

module.exports = {
    executeQuery,
    executeAdHocQuery,
    saveQuery,
    updateQuery,
    deleteQuery,
    getQueries,
    getQuery,
    testConnection
};
