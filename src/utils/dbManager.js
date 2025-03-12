const { Connection, Request } = require('pg');
const AuditTrail = require('../models/auditTrail');
const SybaseDatabase = require('../models/sybaseDatabase');
const logger = require('../utils/logger'); // Assuming you have a logger utility

class DbManager {
    constructor() {
        this.connections = new Map();
    }

    // Get or create connection for a database
    async getConnection(config) {
        const connectionKey = `${config.host}_${config.database_name}_${config.username}`;

        // Check if we already have a connection
        if (this.connections.has(connectionKey)) {
            return this.connections.get(connectionKey);
        }

        try {
            // Create new connection
            const connection = new Connection({
                server: config.host,
                authentication: {
                    type: 'default',
                    options: {
                        userName: config.username,
                        password: config.password
                    }
                },
                options: {
                    database: config.database_name,
                    port: config.port
                }
            });

            // Connect to database
            await new Promise((resolve, reject) => {
                connection.on('connect', (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
                connection.connect();
            });

            // Store connection
            this.connections.set(connectionKey, connection);

            return connection;
        } catch (error) {
            logger.error('Error creating database connection:', error);
            throw new Error(`Failed to connect to database: ${error.message}`);
        }
    }

    // Execute query with audit logging
    async executeQuery(databaseConfig, queryText, userId, options = {}) {
        const startTime = Date.now();
        let connection;

        try {
            // Get connection
            connection = await this.getConnection(databaseConfig);

            // Execute query
            const result = await new Promise((resolve, reject) => {
                const rows = [];
                const request = new Request(queryText, (err, rowCount) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ rows, rowCount });
                    }
                });

                request.on('row', (columns) => {
                    const row = {};
                    columns.forEach((column) => {
                        row[column.metadata.colName] = column.value;
                    });
                    rows.push(row);
                });

                connection.execSql(request);
            });

            // Calculate query duration
            const duration = Date.now() - startTime;

            // Log successful query
            await AuditTrail.logAction({
                userId,
                action: 'EXECUTE_QUERY',
                resource: databaseConfig.database_name,
                ipAddress: options.ip,
                details: {
                    host: databaseConfig.host,
                    database: databaseConfig.database_name,
                    query: queryText, // Log the actual query
                    duration: `${duration}ms`,
                    rowCount: result.rowCount,
                    success: true
                }
            });

            return {
                success: true,
                data: result.rows,
                rowCount: result.rowCount,
                duration
            };
        } catch (error) {
            // Calculate duration even for failed queries
            const duration = Date.now() - startTime;
        }
    

            // Log failed query
            await AuditTrail.logAction({
                userId,
                action: 'QUERY_ERROR',
                resource: databaseConfig.database_name,
                ipAddress: options.ip,
                details: {
                    host: databaseConfig.host,
                    database: databaseConfig.database_name,
                    query: queryText, // Log the actual query
                    duration: `${duration}ms`,
                    error: error.message,
                    success: false
                }
            });

            throw new Error(`Query execution failed: ${error.message}`);
        }

    // Close all connections
    async closeAll() {
        for (const [key, connection] of this.connections.entries()) {
            try {
                connection.close();
                this.connections.delete(key);
            } catch (error) {
                logger.error(`Error closing connection ${key}:`, error);
            }
        }
    }
}

// Create singleton instance
const dbManager = new DbManager();

// Handle cleanup on process exit
process.on('SIGTERM', async () => {
    await dbManager.closeAll();
});

process.on('SIGINT', async () => {
    await dbManager.closeAll();
});

module.exports = dbManager;