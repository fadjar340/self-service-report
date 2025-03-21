const { Model, DataTypes, Op } = require('sequelize');
const sequelize = require('../config/db');
const SybaseDatabase = require('./sybaseDatabase');

class DatabaseQuery extends Model {
    toSafeObject() {
        const { id, name, description, queryText, updatedAt, updatedBy, createdAt, createdBy, deletedAt, deletedBy, isActive, isDeleted, databaseId } = this;
        return { id, name, description, queryText, updatedAt, updatedBy, createdAt, createdBy, deletedAt, deletedBy, isActive, isDeleted, databaseId };
    }

    static validateQuery(queryText) {
        const upperQuery = queryText.trim().toUpperCase();

        if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH') && !upperQuery.startsWith('EXEC')) {
            throw new Error('Query must start with SELECT or WITH');
        }

        const dangerousKeywords = [
            'DELETE',
            'DROP',
            'UPDATE',
            'INSERT',
            'ALTER',
            'CREATE',
            'TRUNCATE',
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
        references: {
            model: 'admin_users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        field: 'createdBy'
    },
    updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'admin_users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        field: 'updatedBy'
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
        allowNull: true,
        defaultValue: true,
        field: 'isActive'
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        field: 'isDeleted'
    },
    deletedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admin_users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        field: 'deletedBy'
    },
    databaseId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'sybase_databases',
            key: 'id'
        },
        field: 'databaseId'
    }
}, {
    sequelize,
    modelName: 'DatabaseQuery',
    tableName: 'database_queries',
    timestamps: true,
    underscored: true,
    hooks: {
        afterCreate: async (query, options) => {
            try {
                const session = options.session || {};
                await sequelize.models.AuditTrail.create({
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
                console.error('Error logging audit trail for query creation:', error);
            }
        },
        afterUpdate: async (query, options) => {
            try {
                const session = options.session || {};
                await sequelize.models.AuditTrail.create({
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
                console.error('Error logging audit trail for query update:', error);
            }
        },
        beforeDestroy: async (query, options) => {
            try {
                const session = options.session || {};
                await sequelize.models.AuditTrail.create({
                    userId: session.user?.id,
                    action: 'DELETE_QUERY',
                    resource: 'DATABASE_QUERY',
                    ipAddress: session.ip,
                    details: {
                        queryId: query.id,
                        name: query.name,
                        isActive: query.isActive,
                        isDeleted: true
                    }
                });
            } catch (error) {
                console.error('Error logging audit trail for query deletion:', error);
            }
        }
    }
});


DatabaseQuery.findOneById = async function (id) {
    return this.findOne({
        where: { id },
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

DatabaseQuery.searchQueries = async function (options = {}) {
    const { 
        search = '', 
        userId = null, 
        limit = 10, 
        offset = 0,
        startDate,
        endDate
    } = options;

    const where = {};

    if (search) {
        where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } },
            { queryText: { [Op.iLike]: `%${search}%` } },
            { isActive: { [Op.eq]: search === 'active' ? true : search === 'inactive' ? false : null } },
        ];
    }

    if (userId) {
        where.createdBy = userId;   
    }

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = startDate;
        if (endDate) where.createdAt[Op.lte] = endDate;
    }
    
    return this.findAndCountAll({
        where,
        limit,
        offset,
        order: [['id', 'ASC']],
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