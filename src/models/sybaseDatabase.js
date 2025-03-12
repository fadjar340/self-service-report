const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const AuditTrail = require('./auditTrail');
//const AdminUser = require('./adminUser');
const { Connection, Request } = require('tedious'); // Use tedious for Sybase

class SybaseDatabase extends Model {
    // Helper method to get connection config
    getConnectionConfig() {
        return {
            conn_name: this.conn_name,
            host: this.host,
            port: this.port,
            database_name: this.database_name,
            username: this.username,
            password: this.password,
            options: {
                connectionTimeout: 30000,
                requestTimeout: 30000,
                encrypt: false,
            },
            isActive: this.isActive
        };
    }


    // Helper method to get safe database info (without credentials)
    toSafeObject() {
        const { conn_name, host, port, database_name, username, createdAt, createdBy, updatedAt, updatedBy, deletedAt, deletedBy, isActive } = this;
        return { conn_name, host, port, database_name, username, createdAt, createdBy, updatedAt, updatedBy, deletedAt, deletedBy, isActive }; // Exclude sensitive info
    }
}

SybaseDatabase.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    conn_name: {
        type: DataTypes.STRING,
        field: 'conn_name',
        allowNull: false,
        unique: {
            msg: 'Database connection name already exists'
        },
        validate: {
            notNull: {
                msg: 'Database connection name is required'
            },
            notEmpty: {
                msg: 'Database connection name cannot be empty'
            },
            len: {
                args: [3, 255],
                msg: 'Database connection name must be between 3 and 255 characters'
            }
        }
    },
    host: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'host',
        validate: {
            notNull: {
                msg: 'Host is required'
            },
            notEmpty: {
                msg: 'Host cannot be empty'
            }
        }
    },
    port: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'port',
        validate: {
            notNull: {
                msg: 'Port is required'
            },
            isInt: {
                msg: 'Port must be a valid integer'
            },
            min: {
                args: [1],
                msg: 'Port must be greater than 0'
            },
            max: {
                args: [65535],
                msg: 'Port must be less than 65536'
            }
        }
    },
    database_name: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'database_name',
        validate: {
            notNull: {
                msg: 'Database name is required'
            },
            notEmpty: {
                msg: 'Database name cannot be empty'
            }
        }
    },
    username: {
        type: DataTypes.STRING,
        field: 'username',
        allowNull: false,
        validate: {
            notNull: {
                msg: 'Username is required'
            },
            notEmpty: {
                msg: 'Username cannot be empty'
            }
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'password',
        validate: {
            notNull: {
                msg: 'Password is required'
            },
            notEmpty: {
                msg: 'Password cannot be empty'
            }
        }
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'createdAt'
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updatedAt'
    },
    updatedBy: {
        type: DataTypes.INTEGER, // Change to INTEGER to match user ID type
        allowNull: true,
        field: 'updatedBy'
    },
    createdBy: {
        type: DataTypes.INTEGER, // Change to INTEGER to match user ID type
        allowNull: true,
        field: 'createdBy'
    },
    deletedBy: {
        type: DataTypes.INTEGER, // Change to INTEGER to match user ID type
        allowNull: true,
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
        defaultValue: true,
        field: 'isActive'
    }
}, {
    sequelize,
    modelName: 'SybaseDatabase',
    tableName: 'sybase_databases',
    timestamps: true, // Enable automatic timestamps
    paranoid: true, // Enable soft delete
    underscored: true,
hooks: {
    afterCreate: async (database, options) => {
        const session = options.session || {};
        await AuditTrail.logAction({
            conn_name: session.user?.conn_name,
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
            conn_name: session.user?.conn_name,
            action: 'UPDATE_DATABASE',
            resource: 'SYBASE_DATABASE',
            ipAddress: session.ip,
            details: {
                conn_name: database.conn_name,
                host: database.host,
                port: database.port,
                database_name: database.database_name,
                username: database.username,
                changes: database.changed(),
                updatedBy: database.updatedBy,
                updatedAt: database.updatedAt,
                isActive: database.isActive
            }
        });
    },
    beforeDestroy: async (database, options) => {
        const session = options.session || {};
        await AuditTrail.logAction({
            conn_name: session.user?.conn_name,
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
                isActive: database.isActive
            }
        });
    }
}});

// Static method to find database by name
SybaseDatabase.findByName = async function (name) {
    return this.findOne({
        where: { conn_name: name }
    });
};

// Static method to find database by name
SybaseDatabase.findAllActive = async function () {
    return this.findAll({
    });
};


// Static Test connection method
SybaseDatabase.testConnection = async function (config) {
    return new Promise((resolve, reject) => {
        // Create a connection configuration
        const connectionConfig = {
            server: config.host, // Server should be at the top level
            authentication: {
                type: 'default',
                options: {
                    userName: config.username, // Use 'userName' instead of 'user'
                    password: config.password
                }
            },
            options: {
                port: config.port || 5000, // Default port for Sybase
                database: config.database_name, // Use 'database' instead of 'database_name'
                encrypt: false, // Disable encryption for FreeTDS
                trustServerCertificate: true, // Trust self-signed certificates
                rowCollectionOnRequestCompletion: true // Return rows as arrays
            }
        };

        // Create a new connection
        const connection = new Connection(connectionConfig);

        // Handle connection events
        connection.on('connect', (err) => {
            if (err) {
                reject(new Error(`Failed to connect to Sybase: ${err.message}`));
            } else {
                console.log('Connected to Sybase successfully');

                // Test the connection with a simple query
                const request = new Request('SELECT 1 AS test', (err, rowCount) => {
                    if (err) {
                        reject(new Error(`Failed to execute test query: ${err.message}`));
                    } else {
                        console.log('Test query executed successfully');
                        resolve(true);
                    }

                    // Close the connection
                    connection.close();
                });

                // Execute the query
                connection.execSql(request);
            }
        });

        // Handle connection errors
        connection.on('error', (err) => {
            reject(new Error(`Connection error: ${err.message}`));
        });
    });
};

// Define associations
SybaseDatabase.associate = (models) => {
    SybaseDatabase.belongsTo(models.AdminUser, { as: 'creator', foreignKey: 'createdBy' });
    SybaseDatabase.belongsTo(models.AdminUser, { as: 'updater', foreignKey: 'updatedBy' });
    SybaseDatabase.belongsTo(models.AdminUser, { as: 'deleter', foreignKey: 'deletedBy' });
};

console.log(SybaseDatabase === sequelize.models.SybaseDatabase); // true

module.exports = SybaseDatabase;