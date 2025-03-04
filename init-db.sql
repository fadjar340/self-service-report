-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create predefined_queries table
CREATE TABLE predefined_queries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sybase_query TEXT NOT NULL,
    created_by INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sybase_databases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    server VARCHAR(255) NOT NULL,
    user VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    database VARCHAR(255) NOT NULL,
    port INT NOT NULL DEFAULT 5000,
    created_by INT REFERENCES admin_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);