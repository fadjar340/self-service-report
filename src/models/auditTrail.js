const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class AuditTrail extends Model {
    static async logAction({ userId, action, resource, ipAddress, details, createdAt }) {
        try {
            return await this.create({
                user_id: userId,
                action,
                resource,
                ip_address: ipAddress,
                details,
                createdAt
            });
        } catch (error) {
            console.error('Audit log creation error:', error);
            // Don't throw error to prevent disrupting main operations
            return null;
        }
    }

    static async getActionStats(days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        try {
            return await this.findAll({
                attributes: [
                    'action',
                    [sequelize.fn('COUNT', '*'), 'count']
                ],
                where: {
                    createdAt: {
                        [sequelize.Op.gte]: startDate
                    }
                },
                group: ['action'],
                order: [[sequelize.fn('COUNT', '*'), 'DESC']]
            });
        } catch (error) {
            console.error('Get action stats error:', error);
            return [];
        }
    }

    static async getUserActivity(userId, limit = 10) {
        try {
            return await this.findAll({
                where: { user_id: userId },
                order: [['createdAt', 'DESC']],
                limit
            });
        } catch (error) {
            console.error('Get user activity error:', error);
            return [];
        }
    }

    static async cleanOldLogs(days = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        try {
            return await this.destroy({
                where: {
                    createdAt: {
                        [sequelize.Op.lt]: cutoffDate
                    }
                }
            });
        } catch (error) {
            console.error('Clean old logs error:', error);
            return 0;
        }
    }
}

AuditTrail.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admin_users',
            key: 'id'
        }
    },
    action: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    resource: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    details: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'AuditTrail',
    tableName: 'audit_trails',
    timestamps: false,
    indexes: [
        {
            name: 'idx_audit_trails_user_id',
            fields: ['user_id']
        },
        {
            name: 'idx_audit_trails_action',
            fields: ['action']
        },
        {
            name: 'idx_audit_trails_createdat',
            fields: ['createdAt']
        }
    ]
});

// Define associations
AuditTrail.associate = (models) => {
    AuditTrail.belongsTo(models.AdminUser, {
        foreignKey: 'user_id',
        as: 'user'
    });
};

module.exports = AuditTrail;
