const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const sequelize = require('./config/db');
const jwt = require('jsonwebtoken');

require('./models/associations');

// Routes
const authRoutes = require('./routes/authRoutes');
const postgresRoutes = require('./routes/postgresRoutes');
const monitorRoutes = require('./routes/monitorRoutes');
const sybaseTdsRoutes = require('./routes/sybaseTdsRoutes');
const userRoutes = require('./routes/userRoutes');
const auditRoutes = require('./routes/auditRoutes');


const app = express();
app.use('/favicon.ico', express.static('icons/favicon.ico'));
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
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/postgres', protect, postgresRoutes);
app.use('/api/queries', protect, postgresRoutes);
app.use('/api/sybase', protect, sybaseTdsRoutes);
app.use('/api/users', protect, userRoutes);
app.use('/api/monitor', protect, monitorRoutes);
app.use('/api/audit', protect, auditRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;