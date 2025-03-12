const express = require('express');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Database and models
const sequelize = require('./config/db');
const AdminUser = require('./models/adminUser');
const AuditTrail = require('./models/auditTrail');
const DatabaseQuery = require('./models/databaseQuery');
const SybaseDatabase = require('./models/sybaseDatabase');

// Routes
const authRoutes = require('./routes/authRoutes');
const queryRoutes = require('./routes/queryRoutes');
const sybaseRoutes = require('./routes/sybaseRoutes');
const auditRoutes = require('./routes/auditRoutes');
const monitorRoutes = require('./routes/monitorRoutes');
const logger = require('./utils/logger'); // Import the logger utility

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 9000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100000
});
app.use('/api/', limiter);

// Session configuration
const sessionStore = new SequelizeStore({
    db: sequelize,
    tableName: 'sessions',
    modelOptions: {
        timestamps: true
    }
});


// Wrap in an async function
const initializeSessionStore = async () => {
    try {
        await sessionStore.sync();
        console.log('Session store synced successfully');
    } catch (err) {
        console.error('Failed to sync session store:', err);
    }
};

// Call the function
initializeSessionStore();


app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 86400000, // 24 hours
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log({
            requestId: req.id,
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            userId: req.session?.user?.id,
            userRole: req.session?.user?.role,
            timestamp: new Date().toISOString()
        });
    });
    next();
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/sybase', sybaseRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/monitor', monitorRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Log error to audit trail
    AuditTrail.logAction({
        userId: req.session?.user?.id,
        action: 'ERROR',
        resource: req.originalUrl,
        ipAddress: req.ip,
        details: {
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    }).catch(console.error);

    res.status(500).json({
        error: 'Server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
});

// Set up model associations
const models = {
    AdminUser,
    AuditTrail,
    DatabaseQuery,
    SybaseDatabase
};

Object.values(models).forEach(model => {
    if (typeof model.associate === 'function') {
        model.associate(models);
    }
});

// Store models in app for use in routes
app.set('models', models);

// Sync database and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established.');

        await sessionStore.sync();
        console.log('Session store synchronized.');

        await sequelize.sync();
        console.log('Database models synchronized.');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
