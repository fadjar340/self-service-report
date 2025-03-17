const os = require('os');
const { EventEmitter } = require('events');
const dbManager = require('../utils/postgresQuery');

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

        this.updateSystemStats();
        setInterval(() => this.updateSystemStats(), 5000);
    }

    trackRequest(startTime, success = true) {
        const duration = Date.now() - startTime;
        this.stats.requests.total++;
        if (success) {
            this.stats.requests.success++;
        } else {
            this.stats.requests.failed++;
        }

        this.stats.requests.avgResponseTime = (
            (this.stats.requests.avgResponseTime * (this.stats.requests.total - 1) + duration) /
            this.stats.requests.total
        );

        this.emit('request', { duration, success });
    }

    trackQuery(duration, success = true) {
        this.stats.queries.total++;
        if (!success) {
            this.stats.queries.failed++;
        }

        this.stats.queries.avgExecutionTime = (
            (this.stats.queries.avgExecutionTime * (this.stats.queries.total - 1) + duration) /
            this.stats.queries.total
        );

        this.emit('query', { duration, success });
    }

    async updateSystemStats() {
        const cpus = os.cpus();
        const cpuLoad = cpus.reduce((total, cpu) => {
            const diff = this._getDiff(cpu.times);
            return total + diff.idle / diff.total;
        }, 0) / cpus.length * 100;

        this.stats.system = {
            cpu: cpuLoad,
            memory: {
                total: os.totalmem(),
                used: os.totalmem() - os.freemem(),
                free: os.freemem()
            },
            uptime: os.uptime()
        };

        try {
            const dbStats = await this.getDatabaseStats();
            this.stats.database = dbStats;
        } catch (error) {
            console.error('Error updating database stats:', error);
        }

        this.emit('stats_updated', this.stats);
    }

    _getDiff(times) {
        const prev = this.prevTimes || times;
        const idle = times.idle - prev.idle;
        const total = Object.values(times).reduce((sum, value) => sum + value, 0) - 
                     Object.values(prev).reduce((sum, value) => sum + value, 0);
        this.prevTimes = times;
        return { idle, total };
    }

    async getDatabaseStats() {
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

    async getActiveQueryCount() {
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

    getStats() {
        return {
            ...this.stats,
            current_time: new Date(),
            uptime: process.uptime()
        };
    }

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

const monitor = new Monitor();

const monitorMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
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