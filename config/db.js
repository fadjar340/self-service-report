const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST || 'db', // Use environment variable with fallback to 'db'
    dialect: 'postgres',
    logging: true,
    logging: console.log, // Log all SQL queries to console
});

module.exports = sequelize;
