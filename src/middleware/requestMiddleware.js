const crypto = require('crypto');

const requestMiddleware = (req, res, next) => {
    req.requestId = crypto.randomUUID();
    next();
};

const errorLoggingMiddleware = (err, req, res, next) => {
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

    next(err);
};

module.exports = {
    requestMiddleware,
    errorLoggingMiddleware
};