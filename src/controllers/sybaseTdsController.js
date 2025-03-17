const { Connection, Request } = require('tedious');
const SybaseDatabase = require('../models/sybaseDatabase');
const AuditTrail = require('../models/auditTrail');
const logger = require('../utils/logger');

// Test Sybase connection
const testConnection = async (req, res) => {
    try {
        const { host, port, username, password, database_name } = req.body;

        if (!host || !port || !username || !password) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Host, port, username, and password are required'
            });
        }

        const config = {
            server: host,
            authentication: {
                type: 'default',
                options: {
                    userName: username,
                    password: password
                }
            },
            options: {
                database: database_name || '',
                port: parseInt(port),
                encrypt: false,
                rowCollectionOnDone: true,
                options: {
                    tdsVersion: '7_4',
                    encrypt: false
                }
            }
        };

        const connection = new Connection(config);

        let timeout = setTimeout(() => {
            connection.close();
            res.status(500).json({
                error: 'Connection error',
                message: 'Connection timed out'
            });
        }, 5000);

        connection.on('connect', (err) => {
            clearTimeout(timeout);
            if (err) {
                logger.error('Test connection error:', err);
                let errorMessage = 'Failed to connect to Sybase';
                if (err.message.includes('ERR_BUFFER_OUT_OF_BOUNDS')) {
                    errorMessage = 'Connection failed: Possible network issue or invalid server response';
                }
                res.status(500).json({
                    error: 'Connection error',
                    message: errorMessage,
                    details: err.message
                });
                return;
            }

            // Test with a simple query
            const request = new Request("SELECT 1 AS test", (err) => {
                if (err) {
                    logger.error('Test query error:', err);
                    res.status(500).json({
                        error: 'Query error',
                        message: 'Failed to execute test query',
                        details: err.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Connection test successful'
                });
                connection.close();
            });

            connection.execSql(request);
        });

        connection.on('error', (err) => {
            clearTimeout(timeout);
            connection.close();
            logger.error('Connection error:', err);
            let errorMessage = 'Connection failed';
            if (err.message.includes('ERR_BUFFER_OUT_OF_BOUNDS')) {
                errorMessage = 'Connection failed: Possible network issue or invalid server response';
            }
            res.status(500).json({
                error: 'Connection error',
                message: errorMessage,
                details: err.message
            });
        });

        connection.on('prelogin', (err, payload) => {
            if (err) {
                clearTimeout(timeout);
                connection.close();
                logger.error('Prelogin error:', err);
                res.status(500).json({
                    error: 'Prelogin error',
                    message: 'Failed during prelogin phase',
                    details: err.message
                });
            }
        });

        connection.connect();
    } catch (error) {
        logger.error('Test connection error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to test connection',
            details: error.message
        });
    }
};

// Helper function to execute queries against Sybase
const executeSybaseQuery = async (database, queryText) => {
    const startTime = Date.now();
    let connection;

    try {
        const config = {
            server: database.host,
            authentication: {
                type: 'default',
                options: {
                    userName: database.username,
                    password: database.password
                }
            },
            options: {
                database: database.database_name,
                port: database.port
            }
        };

        connection = new Connection(config);

        return new Promise((resolve, reject) => {
            let timeout = setTimeout(() => {
                if (connection) {
                    connection.close();
                }
                reject(new Error('Connection timed out'));
            }, 5000);

            connection.on('connect', (err) => {
                clearTimeout(timeout);
                if (err) {
                    logger.error('Query connection error:', err);
                    reject(err);
                    return;
                }

                const request = new Request(queryText, (err, rowCount) => {
                    if (err) {
                        logger.error('Query execution error:', err);
                        reject(err);
                        return;
                    }
                    resolve({ rowCount });
                });

                const rows = [];
                request.on('row', (columns) => {
                    const row = {};
                    columns.forEach((column) => {
                        row[column.metadata.colName] = column.value;
                    });
                    rows.push(row);
                });

                connection.execSql(request);
            });

            connection.on('error', (err) => {
                clearTimeout(timeout);
                if (connection) {
                    connection.close();
                }
                logger.error('Query connection error:', err);
                reject(err);
            });

            connection.connect();
        });

        const duration = Date.now() - startTime;
        return {
            success: true,
            data: rows,
            rowCount,
            duration
        };
    } catch (error) {
        throw new Error(`Query execution failed: ${error.message}`);
    } finally {
        if (connection) {
            connection.close();
        }
    }
};

// Execute a saved query against Sybase
const executeQuery = async (req, res) => {
    try {
        const { queryId } = req.params;
        const { databaseId } = req.body;

        const query = await DatabaseQuery.findByPk(queryId);
        if (!query) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Query not found'
            });
        }

        const database = await SybaseDatabase.findByPk(databaseId);
        if (!database) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Database connection not found'
            });
        }

        try {
            DatabaseQuery.validateQuery(query.queryText);
        } catch (error) {
            return res.status(400).json({
                error: 'Invalid query',
                message: error.message
            });
        }

        const result = await executeSybaseQuery(database, query.queryText);

        await AuditTrail.create({
            userId: req.user.id,
            action: 'EXECUTE_QUERY',
            resource: 'SYBASE_QUERY',
            ipAddress: req.ip,
            details: {
                queryId: query.id,
                databaseId: database.id,
                duration: result.duration,
                rowCount: result.rowCount
            }
        });

        res.json({
            success: true,
            data: result.data,
            metadata: {
                rowCount: result.rowCount,
                duration: result.duration,
                query: query.name,
                database: database.conn_name
            }
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

        const result = await executeSybaseQuery(database, queryText);

        await AuditTrail.create({
            userId: req.user.id,
            action: 'EXECUTE_ADHOC_QUERY',
            resource: 'SYBASE_QUERY',
            ipAddress: req.ip,
            details: {
                databaseId: database.id,
                duration: result.duration,
                rowCount: result.rowCount
            }
        });

        res.json({
            success: true,
            data: result.data,
            metadata: {
                rowCount: result.rowCount,
                duration: result.duration,
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
};

module.exports = {
    testConnection,
    executeQuery,
    executeAdHocQuery
};