-- init-db.sql

-- 1. Create user if not exists (with password)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${PG_USER}') THEN
    CREATE USER "${PG_USER}" WITH PASSWORD "${PG_PASSWORD}";
  END IF;
END
$$;

-- 2. Create database if not exists
CREATE DATABASE "${PG_DATABASE}";
ALTER DATABASE "${PG_DATABASE}" OWNER TO "${PG_USER}";

-- 3. Grant privileges and set ownership
ALTER DATABASE "${PG_DATABASE}" OWNER TO "${PG_USER}";
GRANT ALL PRIVILEGES ON DATABASE  "${PG_DATABASE}" TO "${PG_USER}";

-- 4. Connect to new database
\c  "${PG_DATABASE}"

-- 5. Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Insert initial admin user if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE username = '${PG_USER}') THEN
        INSERT INTO admin_users (username, password, role) VALUES ('${PG_USER}', '${PG_PASSWORD}', 'admin'); -- Default role set to 'admin'
    END IF;
END $$;

-- 7. Create predefined_queries table
CREATE TABLE IF NOT EXISTS predefined_queries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sybase_query TEXT NOT NULL,
    created_by INT REFERENCES admin_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Create sybase_databases table
CREATE TABLE IF NOT EXISTS sybase_databases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    server VARCHAR(255) NOT NULL,
    db_user VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    database VARCHAR(255) NOT NULL,
    port INT NOT NULL DEFAULT 5000,
    created_by INT REFERENCES admin_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Insert sample predefined query
INSERT INTO predefined_queries (name, sybase_query, created_by) VALUES (
    'Sample Query',
    'SELECT * FROM sample_table',
    (SELECT id FROM admin_users WHERE username = '${PG_USER}')
);

-- 10. Insert sample Sybase database
INSERT INTO sybase_databases (name, server, db_user, password, database, port, created_by) VALUES (
    'Sample Sybase DB',
    'sybase.example.com',
    'sybase_user',
    'sybase_password',
    'sample_db',
    5000,
    (SELECT id FROM admin_users WHERE username = '${PG_USER}')
);
