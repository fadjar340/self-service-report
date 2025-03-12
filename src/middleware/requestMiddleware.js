const AuditTrail = require('../models/auditTrail');

// Request logging middleware
const requestMiddleware = async (req, res, next) => {
    // Generate unique request ID
    req.requestId = require('crypto').randomUUID();

    // Add timestamp
    req.timestamp = new Date();

    // Log request start
    console.log({
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        status: undefined,
        duration: undefined,
        userId: req.session?.user?.id,
        userRole: req.session?.user?.role,
        timestamp: req.timestamp.toISOString()
    });

    // Store original end function
    const originalEnd = res.end;

    // Override end function to log response
    res.end = function(chunk, encoding) {
        // Calculate request duration
        const duration = new Date() - req.timestamp;

        // Restore original end function
        res.end = originalEnd;

        // Call original end function
        res.end(chunk, encoding);

        // Log request completion
        console.log({
            requestId: req.requestId,
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            userId: req.session?.user?.id,
            userRole: req.session?.user?.role,
            timestamp: new Date().toISOString()
        });

        // Log to audit trail for authenticated requests
        if (req.session?.user?.id) {
            AuditTrail.logAction({
                userId: req.session.user.id,
                action: 'API_REQUEST',
                resource: req.originalUrl,
                ipAddress: req.ip,
                details: {
                    requestId: req.requestId,
                    method: req.method,
                    url: req.url,
                    status: res.statusCode,
                    duration: duration,
                    userRole: req.session.user.role,
                    timestamp: new Date().toISOString()
                }
            }).catch(error => {
                console.error('Error logging to audit trail:', error);
            });
        }
    };

    next();
};

// Error logging middleware
const errorLoggingMiddleware = (err, req, res, next) => {
    // Log error details
    console.error({
        requestId: req.requestId,
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
        userId: req.session?.user?.id,
        userRole: req.session?.user?.role,
        timestamp: new Date().toISOString()
    });

    // Log to audit trail for authenticated requests
    if (req.session?.user?.id) {
        AuditTrail.logAction({
            userId: req.session.user.id,
            action: 'API_ERROR',
            resource: req.originalUrl,
            ipAddress: req.ip,
            details: {
                requestId: req.requestId,
                error: err.message,
                method: req.method,
                url: req.url,
                userRole: req.session.user.role,
                timestamp: new Date().toISOString()
            }
        }).catch(error => {
            console.error('Error logging to audit trail:', error);
        });
    }

    next(err);
};

module.exports = {
    requestMiddleware,
    errorLoggingMiddleware
};
