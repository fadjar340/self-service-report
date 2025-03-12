const winston = require('winston');

// Create a logger instance
const logger = winston.createLogger({
    level: 'info', // Logging level
    format: winston.format.combine(
        winston.format.timestamp(), // Add timestamp
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        // Log to console
        new winston.transports.Console(),
        // Log to a file
        new winston.transports.File({ filename: 'logs/app.log' })
    ]
});

module.exports = logger;