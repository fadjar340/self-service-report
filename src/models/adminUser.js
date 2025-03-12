const { Model, DataTypes, QueryTypes } = require('sequelize');
const sequelize = require('../config/db');
//const SybaseDatabase = require('./sybaseDatabase');


class AdminUser extends Model {
    // Helper method to check password using pgcrypto
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

    // Helper method to get safe user data (without password)
    toSafeObject() {
        const { id, username, role, createdAt, updatedAt, updatedBy, createdBy } = this;
        return { id, username, role, createdAt, updatedAt, updatedBy, createdBy};
    }

    // Helper method to generate session data
    generateSession() {
        return {
            id: this.id,
            username: this.username,
            role: this.role
        };
    }

    // Static method to find user by credentials
    static async findByCredentials(username, password) {
        try {
            // First find the user
            const user = await this.findOne({ where: { username } });
            if (!user) {
                throw new Error('Invalid login credentials');
            }

            // Verify password using pgcrypto
            const isValid = await user.validatePassword(password);
            if (!isValid) {
                throw new Error('Invalid login credentials');
            }

            return user;
        } catch (error) {
            throw new Error('Invalid login credentials');
        }
    }
}

AdminUser.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
            msg: 'Username already exists'
        },
        validate: {
            notNull: {
                msg: 'Username is required'
            },
            notEmpty: {
                msg: 'Username cannot be empty'
            },
            len: {
                args: [3, 255],
                msg: 'Username must be between 3 and 255 characters'
            }
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: {
                msg: 'Password is required'
            },
            notEmpty: {
                msg: 'Password cannot be empty'
            },
            len: {
                args: [6, 255],
                msg: 'Password must be at least 6 characters long'
            }
        }
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user',
        validate: {
            isIn: {
                args: [['admin', 'user']],
                msg: 'Role must be either admin or user'
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
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'updatedBy',
        references: {
            model: 'admin_users',
            key: 'id'
        }
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'createdBy',
        references: {
            model: 'admin_users',
            key: 'id'
        }
    }
}, {
    sequelize,
    modelName: 'AdminUser',
    tableName: 'admin_users',
    timestamps: true,
    underscored: true,
    hooks: {
        // Hash password before saving using pgcrypto
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

// Define reverse associations
AdminUser.associate = (models) => {
    AdminUser.hasMany(models.SybaseDatabase, { as: 'createdDatabases', foreignKey: 'createdBy' });
    AdminUser.hasMany(models.SybaseDatabase, { as: 'updatedDatabases', foreignKey: 'updatedBy' });
    AdminUser.hasMany(models.SybaseDatabase, { as: 'deletedDatabases', foreignKey: 'deletedBy' });
};

module.exports = AdminUser;
