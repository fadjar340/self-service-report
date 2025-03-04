const { Pool } = require('pg');
const { Connection, Request, TYPES } = require('tedious');

// PostgreSQL configuration
const pgPool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

// Check if a user is an admin
const isAdmin = async (username) => {
  const query = 'SELECT * FROM admin_users WHERE username = $1';
  const result = await pgPool.query(query, [username]);
  return result.rows.length > 0;
};

// Fetch predefined queries
const getPredefinedQueries = async () => {
  const query = 'SELECT id, name, sybase_query FROM predefined_queries';
  const result = await pgPool.query(query);
  return result.rows;
};

// Fetch a predefined query by ID
const getPredefinedQueryById = async (id) => {
  const query = 'SELECT * FROM predefined_queries WHERE id = $1';
  const result = await pgPool.query(query, [id]);
  return result.rows[0];
};

// Create a new predefined query
const createPredefinedQuery = async (name, sybase_query, createdBy) => {
  const query = 'INSERT INTO predefined_queries (name, sybase_query, created_by) VALUES ($1, $2, $3) RETURNING *';
  const result = await pgPool.query(query, [name, sybase_query, createdBy]);
  return result.rows[0];
};

// Update a predefined query
const updatePredefinedQuery = async (id, name, sybase_query) => {
  const query = 'UPDATE predefined_queries SET name = $1, sybase_query = $2 WHERE id = $3 RETURNING *';
  const result = await pgPool.query(query, [name, sybase_query, id]);
  return result.rows[0];
};

// Delete a predefined query
const deletePredefinedQuery = async (id) => {
  const query = 'DELETE FROM predefined_queries WHERE id = $1';
  await pgPool.query(query, [id]);
};

// Execute a Sybase query using tedious
const executeSybaseQuery = async (query, params) => {
  // Fetch the Sybase database configuration from PostgreSQL
  const databaseConfig = await pgPool.query('SELECT * FROM sybase_databases WHERE id = $1', [params.databaseId]);
  if (!databaseConfig.rows[0]) {
    throw new Error('Database not found');
  }

  const { server, user, password, database, port } = databaseConfig.rows[0];

  // Tedious configuration
  const config = {
    server,
    authentication: {
      type: 'default',
      options: {
        userName: user,
        password,
      },
    },
    options: {
      database,
      port: parseInt(port, 10), // Ensure port is a number
      encrypt: false, // Disable encryption for Sybase
    },
  };

  // Create a new connection
  const connection = new Connection(config);

  return new Promise((resolve, reject) => {
    // Handle connection events
    connection.on('connect', (err) => {
      if (err) {
        reject(new Error(`Failed to connect to Sybase: ${err.message}`));
        return;
      }

      console.log('Connected to Sybase database');

      // Execute the query
      const request = new Request(query, (err, rowCount, rows) => {
        if (err) {
          reject(new Error(`Failed to execute query: ${err.message}`));
          return;
        }

        // Format the rows into an array of objects
        const result = rows.map((row) => {
          const obj = {};
          row.forEach((column) => {
            obj[column.metadata.colName] = column.value;
          });
          return obj;
        });

        // Close the connection after the query is executed
        connection.close();
        resolve(result);
      });

      // Add parameters to the query (if any)
      if (params) {
        Object.keys(params).forEach((key) => {
          if (key === 'startDate' || key === 'endDate') {
            request.addParameter(key, TYPES.DateTime, params[key]);
          } else if (key !== 'databaseId') { // Skip databaseId as it's not a query parameter
            request.addParameter(key, TYPES.VarChar, params[key]);
          }
        });
      }

      // Execute the request
      connection.execSql(request);
    });

    // Handle connection errors
    connection.on('error', (err) => {
      reject(new Error(`Connection error: ${err.message}`));
    });
  });
};

module.exports = {
  isAdmin,
  getPredefinedQueries,
  getPredefinedQueryById,
  createPredefinedQuery,
  updatePredefinedQuery,
  deletePredefinedQuery,
  executeSybaseQuery,
};