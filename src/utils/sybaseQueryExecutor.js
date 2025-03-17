const { Connection, Request } = require('tedious');

class SybaseQueryExecutor {
    constructor() {
        this.connections = new Map();
    }

    getConnection(database) {
        const connectionKey = `${database.host}_${database.port}_${database.database_name}`;
        
        if (this.connections.has(connectionKey)) {
            return this.connections.get(connectionKey);
        }

        const connection = new Connection({
            server: database.host,
            authentication: {
                type: 'default',
                options: {
                    userName: database.username,
                    password: database.password
                }
            },
            options: {
                database: database.database_name,
                port: database.port
            }
        });

        connection.on('connect', (err) => {
            if (err) {
                console.error(`Failed to connect to Sybase database ${database.conn_name}:`, err);
                this.connections.delete(connectionKey);
            } else {
                console.log(`Connected to Sybase database ${database.conn_name}`);
                this.connections.set(connectionKey, connection);
            }
        });

        connection.connect();
        
        return connection;
    }

    async executeQuery(database, queryText) {
        const connection = this.getConnection(database);
        return new Promise((resolve, reject) => {
            const request = new Request(queryText, (err, rowCount) => {
                if (err) {
                    return reject(err);
                }
                resolve({ rowCount });
            });

            const rows = [];
            request.on('row', (columns) => {
                const row = {};
                columns.forEach((column) => {
                    row[column.metadata.colName] = column.value;
                });
                rows.push(row);
            });

            connection.execSql(request);
        }).then(result => ({
            ...result,
            data: rows
        }));
    }

    closeAllConnections() {
        for (const [key, connection] of this.connections) {
            connection.close();
            this.connections.delete(key);
        }
    }
}

const executor = new SybaseQueryExecutor();

process.on('SIGTERM', () => executor.closeAllConnections());
process.on('SIGINT', () => executor.closeAllConnections());

module.exports = executor;