const { Sequelize, Op } = require('sequelize');
const sequelize = require('../config/db');
const AdminUser = require('../models/adminUser');
const AuditTrail = require('../models/auditTrail');

class PostgresQuery {
    static async execute(queryText, options = {}) {
        try {
            const { transaction, raw } = options;
            const result = await sequelize.query(queryText, { transaction, raw });
            return result;
        } catch (error) {
            console.error('Postgres query error:', error);
            throw error;
        }
    }

    static async executeWithTransaction(queryText, callback) {
        const transaction = await sequelize.transaction();
        try {
            const result = await this.execute(queryText, { transaction, raw: true });
            await callback(transaction, result);
            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async getActiveUsers() {
        return AdminUser.findAll({
            where: { isDeleted: false },
            attributes: ['id', 'username', 'role']
        });
    }

    static async getAuditLogs(options = {}) {
        const { limit = 100, offset = 0, startDate, endDate, action, userId } = options;

        const where = {};
        if (startDate && endDate) {
            where.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }
        if (action) {
            where.action = action;
        }
        if (userId) {
            where.userId = userId;
        }

        return AuditTrail.findAndCountAll({
            where,
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });
    }
}

module.exports = PostgresQuery;