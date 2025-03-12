const express = require('express');
const router = express.Router();
const { monitor } = require('../utils/monitor');
const { protect } = require('../middleware/authMiddleware');

// Get current monitoring statistics
router.get('/stats', protect, (req, res) => {
    const stats = monitor.getStats();
    res.json({
        message: 'Monitoring statistics retrieved successfully',
        stats
    });
});

// Get system health status
router.get('/health', async (req, res) => {
    try {
        const stats = monitor.getStats();
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                used: `${(stats.system.memory.usagePercent)}%`,
                free: `${(100 - stats.system.memory.usagePercent)}%`
            },
            cpu: `${stats.system.cpu}%`,
            database: {
                status: stats.database.status || 'not_initialized',
                connections: stats.database.connections,
                activeQueries: stats.database.activeQueries
            }
        };

        // Check if system is healthy
        const isHealthy = 
            parseFloat(stats.system.cpu) < 80 && // CPU usage below 80%
            parseFloat(stats.system.memory.usagePercent) < 80 && // Memory usage below 80%
            stats.requests.failed / stats.requests.total < 0.1 && // Error rate below 10%
            (stats.database.status === 'connected' || stats.database.status === 'not_initialized'); // Database status check

        if (!isHealthy) {
            health.status = 'degraded';
            health.issues = [];
            
            if (parseFloat(stats.system.cpu) >= 80) {
                health.issues.push('High CPU usage');
            }
            if (parseFloat(stats.system.memory.usagePercent) >= 80) {
                health.issues.push('High memory usage');
            }
            if (stats.requests.failed / stats.requests.total >= 0.1) {
                health.issues.push('High error rate');
            }
            if (stats.database.status !== 'connected' && stats.database.status !== 'not_initialized') {
                health.issues.push('Database connection issue');
            }
        }

        res.json(health);
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check system health',
            timestamp: new Date().toISOString()
        });
    }
});

// Reset monitoring statistics (admin only)
router.post('/stats/reset', protect, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Only administrators can reset monitoring statistics'
            });
        }

        monitor.resetStats();
        res.json({
            message: 'Monitoring statistics reset successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Stats reset error:', error);
        res.status(500).json({
            error: 'Internal error',
            message: 'Failed to reset monitoring statistics'
        });
    }
});

module.exports = router;
