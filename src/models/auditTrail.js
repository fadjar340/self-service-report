const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const moment = require('moment-timezone');

class AuditTrail extends Model {
    static async logAction({ user_name, action, resource, ipAddress, details }) {
        try {
            const timeZone = process.env.TZ || 'UTC';
            
            return await this.create({
                user_name: user_name,
                action,
                resource,
                ip_address: ipAddress,
                details: {
                    ...details,
                    timestamp: moment.tz(new Date(), timeZone).format('YYYY-MM-DD HH:mm:ss.SSS Z')
                },
                createdAt: moment.tz(new Date(), timeZone).format('YYYY-MM-DD HH:mm:ss.SSS Z')
            });
        } catch (error) {
            console.error('Audit log creation error:', error);
            return null;
        }
    }
}

AuditTrail.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        references: {
            model: 'admin_users',
            key: 'username'
        }
    },
    action: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    resource: {
        type: DataTypes.STRING(255),
        allowNull: false
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
        defaultValue: DataTypes.NOW,
        field: 'createdAt'
    }
}, {
    sequelize,
    modelName: 'AuditTrail',
    tableName: 'audit_trails',
    timestamps: false
});

module.exports = AuditTrail;