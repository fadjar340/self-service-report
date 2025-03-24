const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const AuditTrail = require('./auditTrail');
const DatabaseQuery = require('./databaseQuery');
const AdminUser = require('./adminUser');
const moment = require('moment-timezone');

class SybaseDatabase extends Model {
    getConnectionConfig() {
        return {
            server: this.host,
            authentication: {
                type: 'default',
                options: {
                    userName: this.username,
                    password: this.password
                }
            },
            options: {
                database: this.database_name,
                port: this.port
            }
        };
    }

    toSafeObject() {
        return {
            id: this.id,
            conn_name: this.conn_name,
            host: this.host,
            port: this.port,
            database_name: this.database_name,
            username: this.username,
            createdAt: this.createdAt,
            createdBy: this.createdBy,
            updatedAt: this.updatedAt,
            updatedBy: this.updatedBy,
            isActive: this.isActive,
            isDeleted: this.isDeleted
        };
    }
}

SybaseDatabase.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    conn_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            notNull: true,
            notEmpty: true,
            len: [1, 255]
        }
    },
    host: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notNull: true,
            notEmpty: true,
            len: [1, 255]
        }
    },
    port: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: true,
            min: 1,
            max: 65535
        }
    },
    database_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notNull: true,
            notEmpty: true,
            len: [1, 255]
        }
    },
    username: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notNull: true,
            notEmpty: true,
            len: [1, 255]
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notNull: true,
            notEmpty: true,
            len: [1, 255]
        }
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'createdAt',
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updatedAt'
    },
    updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admin_users',
            key: 'id'
        },
        field: 'updatedBy'
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admin_users',
            key: 'id'
        },
        field: 'createdBy'
    },
    deletedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admin_users',
            key: 'id'
        },
        field: 'deletedBy'
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deletedAt'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'isActive'
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'isDeleted'
    }
}, {
    sequelize,
    modelName: 'SybaseDatabase',
    tableName: 'sybase_databases',
    timestamps: true,
    paranoid: true,
    underscored: true,
    hooks: {
        afterCreate: async (database, options) => {
            const session = options.session || {};
            await AuditTrail.logAction({
                userId: session.user?.id,
                action: 'CREATE_DATABASE',
                resource: 'SYBASE_DATABASE',
                ipAddress: session.ip,
                details: {
                    conn_name: database.conn_name,
                    host: database.host,
                    port: database.port,
                    database_name: database.database_name,
                    username: database.username,
                    createdAt: database.createdAt,
                    createdBy: database.createdBy,
                    isActive: database.isActive
                }
            });
        },
        afterUpdate: async (database, options) => {
            const session = options.session || {};
            await AuditTrail.logAction({
                userId: session.user?.id,
                action: 'UPDATE_DATABASE',
                resource: 'SYBASE_DATABASE',
                ipAddress: session.ip,
                details: {
                    conn_name: database.conn_name,
                    host: database.host,
                    port: database.port,
                    database_name: database.database_name,
                    username: database.username,
                    isActive: database.isActive,
                    changes: database.changed(),
                    updatedBy: database.updatedBy,
                    updatedAt: database.updatedAt,
                    isDeleted: database.isDeleted
                }
            });
        },
        beforeDestroy: async (database, options) => {
            const session = options.session || {};
            await AuditTrail.logAction({
                userId: session.user?.id,
                action: 'DELETE_DATABASE',
                resource: 'SYBASE_DATABASE',
                ipAddress: session.ip,
                details: {
                    conn_name: database.conn_name,
                    host: database.host,
                    port: database.port,
                    database_name: database.database_name,
                    username: database.username,
                    deletedBy: database.deletedBy,
                    deletedAt: database.deletedAt,
                    isActive: database.isActive,
                    isDeleted: database.isDeleted
                }
            });
        }
    }
});

executeQuery = async (queryText) => {
    const connectionConfig = this.getConnectionConfig();
    // Implement your database execution logic here
    // This is a placeholder for actual execution
    return { result: 'Query executed', queryText };
};


module.exports = SybaseDatabase;