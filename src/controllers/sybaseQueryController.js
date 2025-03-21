const odbc = require('odbc');
const SybaseDatabase = require('../models/sybaseDatabase');
const DatabaseQuery = require('../models/databaseQuery');
const logger = require('../utils/logger');

exports.getQueries = async (req, res) => {
    try {
        const queries = await DatabaseQuery.findAll({
            include: [
                {
                    model: SybaseDatabase,
                    as: 'database',
                    attributes: ['id', 'conn_name', 'database_name']
                }
            ]
        });

        res.json({
            queries: queries.map(query => ({
                id: query.id,
                name: query.name,
                description: query.description,
                queryText: query.queryText,
                databaseName: query.database ? query.database.database_name : null
            }))
        });
    } catch (error) {
        console.error('Error fetching queries:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not fetch queries',
            details: error.message
        });
    }
};

exports.executeQuery = async (req, res) => {
    try {
        const { databaseId } = req.params;
        const { id: queryId } = req.body;

        // Retrieve the database configuration
        const database = await SybaseDatabase.findByPk(databaseId);
        if (!database) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Database connection not found'
            });
        }

        // Retrieve the query from the database
        const query = await DatabaseQuery.findByPk(queryId);
        if (!query) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Query not found'
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

exports.executeAdHocQuery = async (req, res) => {
    try {
        const { id } = req.params;
        const { queryText } = req.body;

        const database = await SybaseDatabase.findByPk(id);
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

            db.query(queryText, (err, rows) => {
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
        logger.error('Execute ad-hoc query error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not execute query',
            details: error.message
        });
    }
};