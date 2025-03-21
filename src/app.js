const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const sequelize = require('./config/db');
const logger = require('./utils/logger');
const jwt = require('jsonwebtoken');

require('./models/associations');

// Routes
const authRoutes = require('./routes/authRoutes');
const postgresRoutes = require('./routes/postgresRoutes');
//const queryRoutes = require('./routes/queryRoutes');
const sybaseTdsRoutes = require('./routes/sybaseTdsRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "*"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"]
      }
    }
  }));

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000' || '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minuteswget 
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10000
});
app.use('/api/', limiter);

// Initialize database
sequelize.authenticate()
    .then(() => {
        console.log('Database connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
//app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// JWT protection middleware
const protect = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token'
        });
    }
};

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?.id,
            userRole: req.user?.role,
            timestamp: new Date().toISOString()
        });
    });
    next();
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/postgres', protect, postgresRoutes);
app.use('/api/queries', protect, postgresRoutes);
app.use('/api/sybase', protect, sybaseTdsRoutes);
app.use('/api/users', protect, userRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
        error: 'Server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;