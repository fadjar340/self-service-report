const SybaseDatabase = require('../models/sybaseDatabase');
const DatabaseQuery = require('../models/databaseQuery');
const AuditTrail = require('../models/auditTrail');
const AdminUser = require('../models/adminUser');
const logger = require('../utils/logger');
const { authenticate, authorize } = require('./authController');
const jwt = require('jsonwebtoken');

const getDatabases = async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;

        const where = {
            isDeleted: false // Add this line
        };

        if (search) {
            where.id = { [Op.like]: `%${search}%` };
        }


        const databases = await SybaseDatabase.findAll({
            where,
            limit: parseInt(limit),
            offset: (page - 1) * limit,
        });

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

const getDatabase = async (req, res) => {
    try {
        const { id } = req.params;

        const database = await SybaseDatabase.findByPk(id, {
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
                },
                {
                    model: req.app.get('models').AdminUser,
                    as: 'deleter',
                    attributes: ['username']
                }
            ]
        });

        if (!database) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Database connection not found'
            });
        }

        res.json(database.toSafeObject());
    } catch (error) {
        console.error('Get database error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not retrieve database'
        });
    }
};

const saveDatabase = async (req, res) => {
    try {
        const { conn_name, host, port, database_name, username, password, isActive } = req.body;

        const database = await SybaseDatabase.create({
            conn_name,
            host,
            port,
            database_name,
            username,
            password,
            createdBy: req.user.id,
            isActive,
            isDeleted: false
        });

        await AuditTrail.create({
            userId: req.user.id,
            action: 'CREATE_DATABASE',
            resource: 'SYBASE_DATABASE',
            ipAddress: req.ip,
            details: {
                databaseId: database.id,
                conn_name: database.conn_name,
                host: database.host,
                port: database.port,
                database_name: database.database_name,
                username: database.username,
                isActive: database.isActive
            }
        });

        res.status(201).json({
            message: 'Database connection saved successfully',
            database: database.toSafeObject()
        });
    } catch (error) {
        console.error('Save database error:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Server error',
            message: 'Could not save database connection'
        });
    }
};

const updateDatabase = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const database = await SybaseDatabase.findByPk(id);
        if (!database) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Database connection not found'
            });
        }

        if (database.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to update this database connection'
            });
        }

        // Only include password if it's provided in the update data
        const updateFields = { ...updateData };
        if (!updateFields.password) {
            delete updateFields.password;
        }

        await database.update(updateFields);

        await AuditTrail.create({
            userId: req.user.id,
            action: 'UPDATE_DATABASE',
            resource: 'SYBASE_DATABASE',
            ipAddress: req.ip,
            details: {
                databaseId: database.id,
                conn_name: database.conn_name,
                host: database.host,
                port: database.port,
                database_name: database.database_name,
                username: database.username,
                isActive: database.isActive,
                changes: database.changed()
            }
        });

        res.json({
            message: 'Database connection updated successfully',
            database: database.toSafeObject()
        });
    } catch (error) {
        console.error('Update database error:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Server error',
            message: 'Could not update database connection'
        });
    }
};

const deleteDatabase = async (req, res) => {
    try {
        const { id } = req.params;

        const database = await SybaseDatabase.findByPk(id);
        if (!database) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Database connection not found'
            });
        }

        await database.update({
            isActive: false,
            isDeleted: true,
            deletedBy: req.user.id,
            deletedAt: new Date()
        });

        await AuditTrail.create({
            userId: req.user.id,
            action: 'DELETE_DATABASE',
            resource: 'SYBASE_DATABASE',
            ipAddress: req.ip,
            details: {
                databaseId: id,
                conn_name: database.conn_name
            }
        });

        res.json({
            message: 'Database connection deleted successfully'
        });
    } catch (error) {
        console.error('Delete database error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not delete database connection'
        });
    }
};

const getQueries = async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;

        const where = {
            isDeleted: false // Add this line
        };

        if (search) {
            where.id = { [Op.like]: `%${search}%` };
        }

        const queries = await DatabaseQuery.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: (page - 1) * parseInt(limit),
            order: [['createdAt', 'DESC']],
        });

        res.json({
            queries: queries.rows.map(query => query.toSafeObject()),
            total: queries.count,
            page: parseInt(page),
            totalPages: Math.ceil(queries.count / parseInt(limit))
        });
    } catch (error) {
        console.error('Get queries error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not retrieve queries'
        });
    }
};

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

const saveQuery = async (req, res) => {
    try {
        const { name, description, queryText, connName } = req.body;

        if (!name || !queryText || !connName) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Query name, text, and connection name are required'
            });
        }

        const database = await SybaseDatabase.findOne({
            where: { conn_name: connName }
        });

        if (!database) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Database connection not found'
            });
        }

        const query = await DatabaseQuery.create({
            name,
            description,
            queryText,
            createdBy: req.user.id,
            updatedBy: req.user.id,
            isDeleted: false,
            databaseId: database.id
        });

        await AuditTrail.create({
            userId: req.user.id,
            action: 'CREATE_QUERY',
            resource: 'DATABASE_QUERY',
            ipAddress: req.ip,
            details: {
                queryId: query.id,
                name: query.name,
                description: query.description,
                isActive: query.isActive
            }
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

const updateQuery = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, queryText } = req.body;

        const query = await DatabaseQuery.findByPk(id);
        if (!query) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Query not found'
            });
        }

        if (query.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to update this query'
            });
        }

        await query.update({
            name,
            description,
            queryText,
            updatedBy: req.user.id
        });

        await AuditTrail.create({
            userId: req.user.id,
            action: 'UPDATE_QUERY',
            resource: 'DATABASE_QUERY',
            ipAddress: req.ip,
            details: {
                queryId: query.id,
                name: query.name,
                description: query.description,
                changes: query.changed()
            }
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

const deleteQuery = async (req, res) => {
    try {
        const { id } = req.params;

        const query = await DatabaseQuery.findByPk(id);
        if (!query) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Query not found'
            });
        }

        if (query.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to delete this query'
            });
        }

        await query.update({
            isDeleted: true,
            deletedBy: req.user.id,
            deletedAt: new Date()
        });

        await AuditTrail.create({
            userId: req.user.id,
            action: 'DELETE_QUERY',
            resource: 'DATABASE_QUERY',
            ipAddress: req.ip,
            details: {
                queryId: id,
                name: query.name
            }
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

module.exports = {
    getDatabases,
    getDatabase,
    saveDatabase,
    updateDatabase,
    deleteDatabase,
    getQueries,
    getQuery,
    saveQuery,
    updateQuery,
    deleteQuery
};