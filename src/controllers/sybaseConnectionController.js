const odbc = require('odbc');
const SybaseDatabase = require('../models/sybaseDatabase');
const logger = require('../utils/logger');

exports.testConnection = async (req, res) => {
    try {
        const { id } = req.params;
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