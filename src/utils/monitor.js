const os = require('os');
const { EventEmitter } = require('events');
const dbManager = require('./dbManager');

class Monitor extends EventEmitter {
    constructor() {
        super();
        this.stats = {
            startTime: new Date(),
            requests: {
                total: 0,
                success: 0,
                failed: 0,
                avgResponseTime: 0
            },
            queries: {
                total: 0,
                failed: 0,
                avgExecutionTime: 0
            },
            system: {
                cpu: 0,
                memory: {
                    total: 0,
                    used: 0,
                    free: 0
                },
                uptime: 0
            },
            database: {
                connections: 0,
                activeQueries: 0
            }
        };

        // Update system stats every 5 seconds
        setInterval(() => this.updateSystemStats(), 5000);
    }

    // Track request metrics
    trackRequest(startTime, success = true) {
        const duration = Date.now() - startTime;
        this.stats.requests.total++;
        if (success) {
            this.stats.requests.success++;
        } else {
            this.stats.requests.failed++;
        }

        // Update average response time
        this.stats.requests.avgResponseTime = (
            (this.stats.requests.avgResponseTime * (this.stats.requests.total - 1) + duration) /
            this.stats.requests.total
        );

        this.emit('request', { duration, success });
    }

    // Track query execution
    trackQuery(duration, success = true) {
        this.stats.queries.total++;
        if (!success) {
            this.stats.queries.failed++;
        }

        // Update average execution time
        this.stats.queries.avgExecutionTime = (
            (this.stats.queries.avgExecutionTime * (this.stats.queries.total - 1) + duration) /
            this.stats.queries.total
        );

        this.emit('query', { duration, success });
    }

    // Update system statistics
    async updateSystemStats() {
        const cpus = os.cpus();
        const totalCPU = cpus.reduce((acc, cpu) => {
            const total = Object.values(cpu.times).reduce((a, b) => a + b);
            const idle = cpu.times.idle;
            return acc + ((total - idle) / total);
        }, 0) / cpus.length;

        const totalMem = os.totalmem();
        const freeMem = os.freemem();

        this.stats.system = {
            cpu: (totalCPU * 100).toFixed(2),
            memory: {
                total: totalMem,
                used: totalMem - freeMem,
                free: freeMem,
                usagePercent: ((totalMem - freeMem) / totalMem * 100).toFixed(2)
            },
            uptime: os.uptime(),
            load: os.loadavg()
        };

        // Get database stats
        try {
            const dbStats = await this.getDatabaseStats();
            this.stats.database = dbStats;
        } catch (error) {
            console.error('Error updating database stats:', error);
        }

        this.emit('stats_updated', this.stats);
    }

    // Get database statistics
    async getDatabaseStats() {
        // Check if database is initialized
        if (!dbManager.isInitialized) {
            return {
                connections: 0,
                activeQueries: 0,
                status: 'not_initialized'
            };
        }

        return {
            connections: dbManager.connectionPool.size,
            activeQueries: await this.getActiveQueryCount(),
            status: 'connected'
        };
    }

    // Get active query count from the database
    async getActiveQueryCount() {
        // Skip query if database is not initialized
        if (!dbManager.isInitialized) {
            return 0;
        }

        try {
            const result = await dbManager.executeQuery(
                "SELECT COUNT(*) as count FROM sys.syslocks WHERE type = 'S'",
                {},
                true
            );
            return result?.[0]?.count || 0;
        } catch (error) {
            console.error('Error getting active query count:', error);
            return 0;
        }
    }

    // Get current statistics
    getStats() {
        return {
            ...this.stats,
            current_time: new Date(),
            uptime: process.uptime()
        };
    }

    // Reset statistics
    resetStats() {
        this.stats.requests = {
            total: 0,
            success: 0,
            failed: 0,
            avgResponseTime: 0
        };
        this.stats.queries = {
            total: 0,
            failed: 0,
            avgExecutionTime: 0
        };
        this.emit('stats_reset');
    }
}

// Create singleton instance
const monitor = new Monitor();

// Export middleware function for request tracking
const monitorMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    // Track response
    res.on('finish', () => {
        const success = res.statusCode < 400;
        monitor.trackRequest(startTime, success);
    });

    next();
};

module.exports = {
    monitor,
    monitorMiddleware
};
