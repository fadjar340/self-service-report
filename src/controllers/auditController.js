const { Op } = require('sequelize');
const AuditTrail = require('../models/auditTrail');
const AdminUser = require('../models/adminUser');

const moment = require('moment-timezone');



// Get audit logs with pagination and filters
const getAuditLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        // Build filter conditions
        const where = {};
        
        if (req.query.startDate && req.query.endDate) {
            where.createdAt = {
                [Op.between]: [
                    new Date(req.query.startDate),
                    new Date(req.query.endDate)
                ]
            };
        }

        if (req.query.action) {
            where.action = req.query.action;
        }

        if (req.query.user_name) {
            where.user_name = req.query.userName;
        }

        // Get logs with user information
        const logs = await AuditTrail.findAndCountAll({
            where,
            order: [['createdAt', 'ASC']],
            limit,
            offset
        });

        const timeZone = process.env.TZ || 'UTC';

        // Format response
        const formattedLogs = logs.rows.map(log => ({
            id: log.id,
            timestamp: moment.tz(log.createdAt, timeZone).format('YYYY-MM-DD HH:mm:ss Z'),
            user_name: log.user_name,
            action: log.action,
            resource: log.resource,
            ipAddress: log.ip_address,
            details: log.details,
        }));

        res.json({
            logs: formattedLogs,
            total: logs.count,
            page,
            totalPages: Math.ceil(logs.count / limit)
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not retrieve audit logs'
        });
    }
};

// Get available audit actions
const getAuditActions = async (req, res) => {
    try {
        const actions = await AuditTrail.findAll({
            attributes: [
                [AuditTrail.sequelize.fn('DISTINCT', AuditTrail.sequelize.col('action')), 'action']
            ],
            order: [['action', 'DESC']]
        });

        res.json({
            actions: actions.map(a => a.action)
        });
    } catch (error) {
        console.error('Get audit actions error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not retrieve audit actions'
        });
    }
};

// Get audit statistics
const getAuditStats = async (req, res) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Last 30 days

        const stats = await AuditTrail.findAll({
            attributes: [
                'action',
                [AuditTrail.sequelize.fn('COUNT', '*'), 'count']
            ],
            where: {
                createdAt: {
                    [Op.gte]: startDate
                }
            },
            group: ['action'],
            order: [[AuditTrail.sequelize.fn('COUNT', '*'), 'DESC']]
        });

        res.json({
            stats,
            period: '30 days'
        });
    } catch (error) {
        console.error('Get audit stats error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not retrieve audit statistics'
        });
    }
};

// Delete audit logs older than 3 months
const deleteOldAuditLogs = async (req, res) => {
    try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const result = await AuditTrail.destroy({
            where: {
                createdAt: {
                    [Op.lt]: threeMonthsAgo
                }
            }
        });

        res.json({
            message: `Deleted ${result} audit logs older than 3 months`
        });
    } catch (error) {
        console.error('Delete old audit logs error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Could not delete old audit logs'
        });
    }
};

module.exports = {
    getAuditLogs,
    getAuditActions,
    getAuditStats,
    deleteOldAuditLogs
};