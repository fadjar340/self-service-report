const AdminUser = require('../models/adminUser');
const AuditTrail = require('../models/auditTrail');

// Protect routes - check if user is authenticated
const protect = async (req, res, next) => {
    try {
        // Check if session exists and has user data
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Please log in to access this resource'
            });
        }

        // Get user from database to ensure they still exist and have proper permissions
        const user = await AdminUser.findByPk(req.session.user.id);
        if (!user) {
            // Clear invalid session
            req.session.destroy();
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User no longer exists'
            });
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Authentication check failed'
        });
    }
};

// Admin only middleware
const isAdmin = async (req, res, next) => {
    try {
        // First run protect middleware
        protect(req, res, async () => {
            // Check if user is admin
            if (req.user.role !== 'admin') {
                // Log unauthorized access attempt
                await AuditTrail.logAction({
                    userId: req.user.id,
                    action: 'UNAUTHORIZED_ACCESS',
                    resource: req.originalUrl,
                    ipAddress: req.ip,
                    details: {
                        method: req.method,
                        path: req.path,
                        userRole: req.user.role
                    }
                });

                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Admin access required'
                });
            }

            next();
        });
    } catch (error) {
        console.error('Admin check middleware error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Admin check failed'
        });
    }
};

// Check session status for frontend routes
const checkSession = async (req, res, next) => {
    // Skip session check for public routes
    const publicPaths = [
        '/',
        '/index.html',
        '/css',
        '/js',
        '/images',
        '/favicon.ico',
        '/api/auth/login'
    ];

    // Check if the path starts with any of the public paths
    const isPublicPath = publicPaths.some(path => 
        req.path === path || req.path.startsWith(`${path}/`)
    );

    if (isPublicPath) {
        return next();
    }

    // Check if user is authenticated
    if (!req.session || !req.session.user) {
        // If requesting HTML page, redirect to login
        if (req.accepts('html')) {
            return res.redirect('/index.html');
        }
        // If API request, return 401
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Please log in to access this resource'
        });
    }

    // For authenticated users, check if user still exists
    try {
        const user = await AdminUser.findByPk(req.session.user.id);
        if (!user) {
            // Clear invalid session
            req.session.destroy();
            
            // If requesting HTML page, redirect to login
            if (req.accepts('html')) {
                return res.redirect('/index.html');
            }
            // If API request, return 401
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User no longer exists'
            });
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        console.error('Session check middleware error:', error);
        
        // If requesting HTML page, redirect to login
        if (req.accepts('html')) {
            return res.redirect('/index.html');
        }
        // If API request, return 500
        res.status(500).json({
            error: 'Server error',
            message: 'Session check failed'
        });
    }
};

// Session data middleware
const addSessionData = (req, res, next) => {
    // Add session data to options for model hooks
    req.options = {
        ...req.options,
        session: {
            user: req.user,
            ip: req.ip
        }
    };
    next();
};

module.exports = {
    protect,
    isAdmin,
    checkSession,
    addSessionData
};
