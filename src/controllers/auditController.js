const { Op } = require('sequelize');
const AuditTrail = require('../models/auditTrail');
const AdminUser = require('../models/adminUser');

// Get audit logs with pagination and filters
const getAuditLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        // Build filter conditions
        const where = {};
        
        if (req.query.startDate && req.query.endDate) {
            where.createdat = {
                [Op.between]: [
                    new Date(req.query.startDate),
                    new Date(req.query.endDate)
                ]
            };
        }

        if (req.query.action) {
            where.action = req.query.action;
        }

        if (req.query.userId) {
            where.user_id = req.query.userId;
        }

        // Get logs with user information
        const logs = await AuditTrail.findAndCountAll({
            where,
            include: [{
                model: AdminUser,
                as: 'user',
                attributes: ['username']
            }],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        // Format response
        const formattedLogs = logs.rows.map(log => ({
            id: log.id,
            timestamp: log.createdAt,
            user: log.user ? { id: log.user_id, username: log.user.username } : null,
            action: log.action,
            resource: log.resource,
            ipAddress: log.ip_address,
            details: log.details,
            createdBy: log.createdBy,
            updatedBy: log.updatedBy,
            updatedAt: log.updatedAt
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
            order: [['action', 'ASC']]
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

module.exports = {
    getAuditLogs,
    getAuditActions,
    getAuditStats
};
