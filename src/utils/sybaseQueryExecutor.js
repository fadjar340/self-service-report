// sybaseQueryExecutor.js
const odbc = require('odbc');

class SybaseQueryExecutor {
    constructor() {
        this.connections = new Map();
    }

    async getConnection(database) {
        const connectionKey = `${database.host}_${database.port}_${database.database_name}`;
        
        if (this.connections.has(connectionKey)) {
            return this.connections.get(connectionKey);
        }

        const connectionString = `
            Driver={FreeTDS};
            Server=${database.host};
            Port=${database.port};
            Database=${database.database_name};
            UID=${database.username};
            PWD=${database.password};
            TDS_Version=5.0;
        `;

        let connection;
        try {
            connection = await odbc.connect(connectionString);
            this.connections.set(connectionKey, connection);
            console.log(`Connected to Sybase database ${database.conn_name}`);
        } catch (err) {
            console.error(`Error creating connection for ${database.conn_name}:`, err);
            throw err;
        }

        return connection;
    }

    async executeQuery(database, queryText) {
        const connection = await this.getConnection(database);
        
        try {
            const results = await connection.query(queryText);
            return { data: results, rowCount: results.length };
        } catch (err) {
            console.error(`Query error on ${database.conn_name}:`, err);
            throw err;
        }
    }

    closeAllConnections() {
        for (const [key, connection] of this.connections) {
            connection.close()
                .then(() => {
                    console.log(`Closed connection to ${key}`);
                    this.connections.delete(key);
                })
                .catch(err => {
                    console.error(`Error closing connection ${key}:`, err);
                });
        }
    }
}

const executor = new SybaseQueryExecutor();

process.on('SIGTERM', () => executor.closeAllConnections());
process.on('SIGINT', () => executor.closeAllConnections());

module.exports = executor;