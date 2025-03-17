const { Sequelize } = require('sequelize');
const sequelize = require('../config/db');

class DbManager {
    constructor() {
        this.pool = sequelize;
    }

    getPool() {
        return this.pool;
    }

    async executeQuery(queryText, userId, ip) {
        try {
            const result = await this.pool.query(queryText, {
                type: sequelize.QueryTypes.SELECT
            });

            await sequelize.models.AuditTrail.create({
                userId,
                action: 'EXECUTE_QUERY',
                resource: 'DATABASE',
                ip_address: ip,
                details: {
                    query: queryText,
                    duration: 'N/A', // Duration will be tracked in monitor middleware
                    rowCount: result.length,
                    success: true
                }
            });

            return {
                success: true,
                data: result,
                rowCount: result.length
            };
        } catch (error) {
            await sequelize.models.AuditTrail.create({
                userId,
                action: 'QUERY_ERROR',
                resource: 'DATABASE',
                ip_address: ip,
                details: {
                    query: queryText,
                    error: error.message,
                    success: false
                }
            });

            throw new Error(`Query execution failed: ${error.message}`);
        }
    }
}

const dbManager = new DbManager();

module.exports = dbManager;