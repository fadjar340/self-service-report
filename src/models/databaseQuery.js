const { Model, DataTypes, Op } = require('sequelize');
const sequelize = require('../config/db');
const AuditTrail = require('./auditTrail');
const logger = require('../utils/logger'); // Assuming you have a logger utility

class DatabaseQuery extends Model {
    // Helper method to get safe query info
    toSafeObject() {
        const {name, description, queryText,updatedAt,updatedBy,createdAt,createdBy,deletedAt, deletedBy,isActive } = this;
        return { name, description, queryText, updatedAt,updatedBy,createdAt,createdBy,deletedAt, deletedBy,isActive };
    }

    // Static method to validate query
    static validateQuery(queryText) {
        const upperQuery = queryText.trim().toUpperCase();
        
        // Check if query starts with SELECT or WITH
        if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH')) {
            throw new Error('Query must start with SELECT or WITH');
        }

        // Check for dangerous keywords
        const dangerousKeywords = [
            'DELETE',
            'DROP',
            'UPDATE',
            'INSERT',
            'ALTER',
            'CREATE',
            'TRUNCATE',
            'EXEC',
            'EXECUTE'
        ];

        for (const keyword of dangerousKeywords) {
            if (upperQuery.includes(keyword)) {
                throw new Error(`Query contains forbidden keyword: ${keyword}`);
            }
        }

        return true;
    }
}

DatabaseQuery.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: {
                msg: 'Query name is required'
            },
            notEmpty: {
                msg: 'Query name cannot be empty'
            },
            len: {
                args: [3, 255],
                msg: 'Query name must be between 3 and 255 characters'
            }
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    queryText: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'query_text',
        validate: {
            notNull: {
                msg: 'Query text is required'
            },
            notEmpty: {
                msg: 'Query text cannot be empty'
            },
            isSafeQuery(value) {
                DatabaseQuery.validateQuery(value);
            }
        }
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'createdBy',
        references: {
            model: 'admin_users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
    },
    updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'updatedBy',
        references: {
            model: 'admin_users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'isActive'
    }
}, {
    sequelize,
    modelName: 'DatabaseQuery',
    tableName: 'database_queries',
    timestamps: true,
    underscored: true,
    hooks: {
        // Log query creation
        afterCreate: async (query, options) => {
            try {
                const session = options.session || {};
                await AuditTrail.logAction({
                    userId: session.user?.id,
                    action: 'CREATE_QUERY',
                    resource: 'DATABASE_QUERY',
                    ipAddress: session.ip,
                    details: {
                        queryId: query.id,
                        name: query.name,
                        description: query.description,
                        isActive: query.isActive
                    }
                });
            } catch (error) {
                logger.error('Error logging audit trail for query creation:', error);
            }
        },
        // Log query update
        afterUpdate: async (query, options) => {
            try {
                const session = options.session || {};
                await AuditTrail.logAction({
                    userId: session.user?.id,
                    action: 'UPDATE_QUERY',
                    resource: 'DATABASE_QUERY',
                    ipAddress: session.ip,
                    details: {
                        queryId: query.id,
                        name: query.name,
                        description: query.description,
                        changes: query.changed(),
                        isActive: query.isActive
                    }
                });
            } catch (error) {
                logger.error('Error logging audit trail for query update:', error);
            }
        },
        // Log query deletion
        beforeDestroy: async (query, options) => {
            try {
                const session = options.session || {};
                await AuditTrail.logAction({
                    userId: session.user?.id,
                    action: 'DELETE_QUERY',
                    resource: 'DATABASE_QUERY',
                    ipAddress: session.ip,
                    details: {
                        queryId: query.id,
                        name: query.name,
                        isActive: query.isActive
                    }
                });
            } catch (error) {
                logger.error('Error logging audit trail for query deletion:', error);
            }
        }
    }
});

// Define associations
DatabaseQuery.associate = (models) => {
    DatabaseQuery.belongsTo(models.AdminUser, {
        as: 'creator',
        foreignKey: 'createdBy'
    });
    DatabaseQuery.belongsTo(models.AdminUser, {
        as: 'updater',
        foreignKey: 'updatedBy'
    });
};

// Static method to find query by name
DatabaseQuery.findByName = async function(name) {
    return this.findOne({
        where: { name },
        include: [
            {
                model: sequelize.models.AdminUser,
                as: 'creator',
                attributes: ['username']
            },
            {
                model: sequelize.models.AdminUser,
                as: 'updater',
                attributes: ['username']
            }
        ]
    });
};

// Static method to search queries
DatabaseQuery.searchQueries = async function(options = {}) {
    const { 
        search = '', 
        userId = null, 
        limit = 10, 
        offset = 0,
        startDate,
        endDate
    } = options;

    const where = {};

    // Add search condition
    if (search) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } },
            { queryText: { [Op.iLike]: `%${search}%` } },
            { isActive: { [Op.eq]: search === 'active' ? true : search === 'inactive' ? false : null } }
        ];
    }

    // Add user filter
    if (userId) {
        where.createdBy = userId;
    }

    // Add date range filter
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = startDate;
        if (endDate) where.createdAt[Op.lte] = endDate;
    }

    return this.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
            {
                model: sequelize.models.AdminUser,
                as: 'creator',
                attributes: ['username']
            },
            {
                model: sequelize.models.AdminUser,
                as: 'updater',
                attributes: ['username']
            }
        ]
    });
};

module.exports = DatabaseQuery;