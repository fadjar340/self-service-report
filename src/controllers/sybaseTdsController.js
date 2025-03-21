const odbc = require('odbc');
const SybaseDatabase = require('../models/sybaseDatabase');
const DatabaseQuery = require('../models/databaseQuery')
const AuditTrail = require('../models/auditTrail');
const logger = require('../utils/logger');

// Test Sybase connection
const testConnection = async (req, res) => {
        try {
            const { requestId } = req.params;
            const database = await DatabaseQuery.findOneById(requestId);
            if (!database) {
                return res.status(404).json({
                    error: 'Not found',
                    message: 'Database connection not found'
                });
            }

            const connectionString = {
                Driver: 'FreeTDS',
                Server: database.host,
                Port: database.port,
                Database: database.database_name,
                UID: database.username,
                PWD: database.password,
                TDS_Version: '5.0'
            };

        const db = new odbc.Database();
        db.open(connectionString, (err) => {
            if (err) {
                logger.error('Connection error:', err);
                return res.status(500).json({
                    error: 'Connection error',
                    message: 'Failed to connect to Sybase',
                    details: err.message
                });
            }

            db.query("SELECT 1 AS test", (err, rows) => {
                if (err) {
                    logger.error('Test query error:', err);
                    db.close();
                    return res.status(500).json({
                        error: 'Query error',
                        message: 'Failed to execute test query',
                        details: err.message
                    });
                }

                db.close();
                res.json({
                    success: true,
                    message: 'Connection test successful'
                });
            });
        });
    } catch (error) {
        logger.error('Test connection error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not test connection',
            details: error.message
        });
    }
};

// Helper function to execute queries against Sybase
const executeSybaseQuery = async (database, queryText) => {
    return new Promise((resolve, reject) => {
        const db = new odbc.Database();
        const connectionString = {
            Driver: 'FreeTDS',
            Server: database.host,
            Port: database.port,
            Database: database.database_name,
            UID: database.username,
            PWD: database.password,
            TDS_Version: '5.0'
        };

        db.open(connectionString, (err) => {
            if (err) {
                logger.error('Connection error:', err);
                return reject(new Error(`Connection failed: ${err.message}`));
            }

            db.query(queryText, (err, rows) => {
                if (err) {
                    logger.error('Query execution error:', err);
                    db.close();
                    return reject(new Error(`Query execution failed: ${err.message}`));
                }

                db.close();
                resolve({
                    success: true,
                    data: rows,
                    rowCount: rows.length
                });
            });
        });
    });
};

// Execute a saved query against Sybase
exports.executeQuery = async (req, res) => {
    try {
        const { queryId, databaseId } = req.body;

        // Retrieve the query from the database
        const query = await DatabaseQuery.findByPk(queryId);
        if (!query) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Query not found'
            });
        }

        // Retrieve the database configuration
        const database = await SybaseDatabase.findByPk(databaseId);
        if (!database) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Database connection not found'
            });
        }

        // Establish connection using ODBC
        const connectionString = {
            Driver: 'FreeTDS',
            Server: database.host,
            Port: database.port,
            Database: database.database_name,
            UID: database.username,
            PWD: database.password,
            TDS_Version: '5.0'
        };

        const db = new odbc.Database();
        db.open(connectionString, (err) => {
            if (err) {
                logger.error('Connection error:', err);
                return res.status(500).json({
                    error: 'Connection error',
                    message: 'Failed to connect to Sybase',
                    details: err.message
                });
            }

            // Execute the query
            db.query(query.queryText, (err, rows) => {
                if (err) {
                    logger.error('Query execution error:', err);
                    db.close();
                    return res.status(500).json({
                        error: 'Query error',
                        message: 'Failed to execute query',
                        details: err.message
                    });
                }

                db.close();
                res.json({
                    success: true,
                    data: rows,
                    message: 'Query executed successfully'
                });
            });
        });
    } catch (error) {
        logger.error('Execute query error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not execute query',
            details: error.message
        });
    }
};

// Execute an ad-hoc query against Sybase
const executeAdHocQuery = async (req, res) => {
    try {
        const { databaseId, queryText } = req.body;

        const database = await SybaseDatabase.findByPk(databaseId);
        if (!database) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Database connection not found'
            });
        }

        try {
            DatabaseQuery.validateQuery(queryText);
        } catch (error) {
            return res.status(400).json({
                error: 'Invalid query',
                message: error.message
            });
        }

        try {
            const result = await executeSybaseQuery(database, queryText);

            await AuditTrail.create({
                userId: req.user.id,
                action: 'EXECUTE_ADHOC_QUERY',
                resource: 'SYBASE_QUERY',
                ipAddress: req.ip,
                details: {
                    databaseId: database.id,
                    rowCount: result.rowCount
                }
            });

            res.json({
                success: true,
                data: result.data,
                metadata: {
                    rowCount: result.rowCount,
                    database: database.conn_name
                }
            });
        } catch (error) {
            logger.error('Execute ad-hoc query error:', error);
            res.status(500).json({
                error: 'Server error',
                message: 'Could not execute query',
                details: error.message
            });
        }
    } catch (error) {
        logger.error('Execute ad-hoc query error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not execute query',
            details: error.message
        });
    }
};

module.exports = {
    testConnection,
    executeQuery,
    executeAdHocQuery
};