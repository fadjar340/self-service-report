const { Model, DataTypes, QueryTypes } = require('sequelize');
const sequelize = require('../config/db');
const SybaseDatabase = require('./sybaseDatabase')
const DatabaseQuery = require('./databaseQuery')
const moment = require('moment-timezone');

class AdminUser extends Model {
    async validatePassword(password) {
        try {
            const result = await sequelize.query(
                'SELECT (password = crypt($1, password)) as valid FROM admin_users WHERE id = $2',
                {
                    bind: [password, this.id],
                    type: QueryTypes.SELECT
                }
            );
            return result[0]?.valid || false;
        } catch (error) {
            console.error('Password validation error:', error);
            return false;
        }
    }

    toSafeObject() {
        const { id, username, role, createdAt, updatedAt, updatedBy, createdBy, isActive } = this;
        return { id, username, role, createdAt, updatedAt, updatedBy, createdBy, isActive };
    }

    static findByCredentials(username, password) {
        return this.findOne({ where: { username } }).then(user => {
            if (!user) {
                return Promise.reject(new Error('Invalid login credentials'));
            }

            return user.validatePassword(password).then(isValid => {
                if (!isValid) {
                    return Promise.reject(new Error('Invalid login credentials'));
                }
                return user;
            });
        });
    }

}

AdminUser.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            notNull: true,
            notEmpty: true,
            len: [3, 255]
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notNull: true,
            notEmpty: true,
            len: [6, 255]
        }
    },
    role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'user',
        validate: {
            isIn: [['admin', 'user']]
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
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'updatedBy',
        references: {
            model: 'admin_users',
            key: 'username'
        }
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'createdBy',
        references: {
            model: 'admin_users',
            key: 'username'
        }
    },
    deletedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'deletedBy',
        references: {
            model: 'admin_users',
            key: 'username'
        }
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
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'isDeleted'
    }
}, {
    sequelize,
    modelName: 'AdminUser',
    tableName: 'admin_users',
    timestamps: true,
    paranoid: true,
    underscored: true,
    hooks: {
        beforeSave: async (user) => {
            if (user.changed('password')) {
                const [result] = await sequelize.query(
                    'SELECT crypt($1, gen_salt($2, $3)) as hash',
                    {
                        bind: [user.password, 'bf', 10],
                        type: QueryTypes.SELECT
                    }
                );
                user.password = result.hash;
            }
        }
    }
});


module.exports = AdminUser;