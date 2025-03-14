// test-connection.js (Server-side)
const { Connection, Request } = require('tedious');
const express = require('express');
const router = express.Router();

router.post('/sybase/test-connection', async (req, res) => {
    const config = req.body;
    
    // Validate input
    if (!config.host || !config.port || !config.username || !config.password || !config.database_name) {
        return res.status(400).json({ message: 'Missing required connection parameters' });
    }

    // Configure connection options for FreeTDS
    const connectionConfig = {
        server: config.host,
        authentication: {
            type: 'default',
            options: {
                userName: config.username,
                password: config.password
            }
        },
        options: {
            port: parseInt(config.port),
            database: config.database_name,
            encrypt: false, // Typically false for on-premise databases
            rowCollectionOnDone: true,
            // FreeTDS specific configuration
            options: {
                tdsVersion: '7_4', // Match your FreeTDS version
                encrypt: false
            }
        }
    };

    // Wrap connection in a promise
    const testConnection = () => new Promise((resolve, reject) => {
        const connection = new Connection(connectionConfig);
        let timeout = setTimeout(() => {
            connection.close();
            reject(new Error('Connection timeout'));
        }, 5000);

        connection.on('connect', (err) => {
            clearTimeout(timeout);
            if (err) {
                connection.close();
                reject(err);
            } else {
                // Test with a simple query
                const request = new Request("SELECT 1 AS test", (err) => {
                    if (err) reject(err);
                    connection.close();
                });
                
                request.on('row', columns => {
                    resolve(true);
                });
                
                connection.execSql(request);
            }
        });

        connection.on('error', (err) => {
            clearTimeout(timeout);
            connection.close();
            reject(err);
        });
    });

    try {
        await testConnection();
        res.json({ success: true });
    } catch (error) {
        console.error('Connection test failed:', error);
        res.status(500).json({
            success: false,
            message: this.sanitizeError(error.message)
        });
    }
});

// Helper to sanitize error messages
function sanitizeError(error) {
    return error.replace(/password=.*?;/i, 'password=******;');
}

module.exports = router;