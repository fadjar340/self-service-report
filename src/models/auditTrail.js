const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class AuditTrail extends Model {
    static async logAction({ userId, action, resource, ipAddress, details }) {
        try {
            return await this.create({
                user_id: userId,
                action,
                resource,
                ip_address: ipAddress,
                details,
                createdAt: new Date()
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