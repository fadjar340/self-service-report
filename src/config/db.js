const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'self_service',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    logging: false,
    pool: {
        max: parseInt(process.env.SQL_POOL_MAX) || 10,
        min: parseInt(process.env.SQL_POOL_MIN) || 0,
        acquire: parseInt(process.env.SQL_CONNECTION_TIMEOUT) || 30000,
        idle: parseInt(process.env.SQL_POOL_IDLE_TIMEOUT) || 30000
    },
    retry: {
        max: 5,
        match: [
            /ConnectionError/,
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/,
            /SequelizeInvalidConnectionError/,
            /SequelizeConnectionTimedOutError/
        ],
        backoffBase: 1000,
        backoffExponent: 1.5,
    }
});

sequelize.authenticate()
    .then(() => {
        console.log('PostgreSQL database connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the PostgreSQL database:', err);
    });

module.exports = sequelize;