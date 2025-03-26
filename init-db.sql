-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" VARCHAR(255) REFERENCES admin_users(username),
    "createdBy" VARCHAR(255) REFERENCES admin_users(username),
    "deletedBy" VARCHAR(255) REFERENCES admin_users(username) DEFAULT NULL,
    "deletedAt" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "isDeleted" BOOLEAN DEFAULT FALSE
);

-- Create audit_trails table
CREATE TABLE IF NOT EXISTS audit_trails (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) REFERENCES admin_users(username),
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    details JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sybase_databases table
CREATE TABLE sybase_databases (
    id SERIAL PRIMARY KEY,
    conn_name VARCHAR(255) NOT NULL UNIQUE,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    database_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    "createdBy" VARCHAR(255) REFERENCES admin_users(username),
    "updatedBy" VARCHAR(255) REFERENCES admin_users(username),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "deletedBy" VARCHAR(255) REFERENCES admin_users(username) DEFAULT NULL,
    "deletedAt" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    "isActive" BOOLEAN DEFAULT FALSE,
    "isDeleted" BOOLEAN DEFAULT FALSE
);

-- Create database_queries table
CREATE TABLE IF NOT EXISTS database_queries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    query_text TEXT NOT NULL,
    "createdBy" VARCHAR(255) REFERENCES admin_users(username),
    "updatedBy" VARCHAR(255) REFERENCES admin_users(username),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "deletedBy" VARCHAR(255) REFERENCES admin_users(username) DEFAULT NULL,
    "deletedAt" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    "isActive" BOOLEAN NOT NULL,
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "databaseId" INTEGER REFERENCES sybase_databases(id)
);

-- Constraints
ALTER TABLE sybase_databases ADD CONSTRAINT sybase_databases_id_unique UNIQUE (id);
ALTER TABLE database_queries ADD CONSTRAINT database_queries_id_unique UNIQUE (id);
ALTER TABLE admin_users ADD CONSTRAINT admin_users_username_unique UNIQUE (username);


-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_trails_user_name ON audit_trails(user_name);
CREATE INDEX IF NOT EXISTS idx_audit_trails_action ON audit_trails(action);
CREATE INDEX IF NOT EXISTS idx_audit_trails_createdAt ON audit_trails("createdAt");
CREATE INDEX IF NOT EXISTS idx_database_queries_createdBy ON database_queries("createdBy");
--CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
CREATE INDEX IF NOT EXISTS idx_database_queries_database_id ON database_queries("databaseId");

-- Create default admin user (password: admin123)
-- Using pgcrypto to hash password with bcrypt
INSERT INTO admin_users (username, password, role, "isActive", "isDeleted")
VALUES (
    'admin',
    crypt('admin123', gen_salt('bf', 10)),
    'admin',
    TRUE,
    FALSE
) ON CONFLICT (username) DO NOTHING;

-- Sample Sybase_database data
INSERT INTO sybase_databases (conn_name, host, port, database_name, username, password, "isActive", "isDeleted")
VALUES (
    'Sybase Database',
    'localhost',
    5000,
    'sample_db',
    'sa',
    'password',
    TRUE,
    FALSE
) ON CONFLICT (id) DO NOTHING;

-- Sample database_queries data
INSERT INTO database_queries (name, description, query_text, "isActive", "isDeleted", "databaseId" )
VALUES (
    'Sample Query',
    'This is a sample query',
    'SELECT * FROM sample_table',
    FALSE,
    FALSE,
    1
) ON CONFLICT (id) DO NOTHING;

----
-- Add triggers for updatedat
CREATE OR REPLACE FUNCTION update_updatedAt_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_createdAt_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."createdAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_deletedAt_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."deletedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_createdBy_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."createdBy" = (SELECT username FROM admin_users WHERE username = current_user)::VARCHAR;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_updatedBy_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedBy" = (SELECT username FROM admin_users WHERE username = current_user)::VARCHAR;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_deletedBy_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."deletedBy" = (SELECT username FROM admin_users WHERE username = current_user)::VARCHAR;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- admin users triggers
CREATE TRIGGER update_admin_users_createdAt
    BEFORE INSERT ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updatedAt_column();

CREATE TRIGGER update_admin_users_updatedAt
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updatedAt_column();

CREATE TRIGGER update_admin_users_deletedAt
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_deletedBy_column();

CREATE TRIGGER update_admin_users_createdBy
    BEFORE INSERT ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_createdBy_column();

CREATE TRIGGER update_admin_users_updatedBy
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updatedBy_column();

CREATE TRIGGER update_admin_users_deletedBy
    BEFORE INSERT ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_deletedBy_column();

-- database_queries triggers
CREATE TRIGGER update_database_queries_createdAt
    BEFORE INSERT ON database_queries
    FOR EACH ROW
    EXECUTE FUNCTION update_createdAt_column();

CREATE TRIGGER update_database_queries_updatedAt
    BEFORE UPDATE ON database_queries
    FOR EACH ROW
    EXECUTE FUNCTION update_updatedAt_column();

CREATE TRIGGER update_database_queries_createdBy
    BEFORE INSERT ON database_queries
    FOR EACH ROW
    EXECUTE FUNCTION update_createdBy_column();

CREATE TRIGGER update_database_queries_updatedBy
    BEFORE UPDATE ON database_queries
    FOR EACH ROW
    EXECUTE FUNCTION update_updatedBy_column();

CREATE TRIGGER update_database_queries_deletedBy
    BEFORE UPDATE ON database_queries
    FOR EACH ROW
    EXECUTE FUNCTION update_deletedBy_column();

-- sybase_databases triggers
CREATE TRIGGER update_sybase_databases_updatedAt
    BEFORE UPDATE ON sybase_databases
    FOR EACH ROW
    EXECUTE FUNCTION update_updatedAt_column();

CREATE TRIGGER update_sybase_databases_createdAt
    BEFORE INSERT ON sybase_databases
    FOR EACH ROW
    EXECUTE FUNCTION update_createdAt_column();

CREATE TRIGGER update_sybase_databases_createdBy
    BEFORE INSERT ON sybase_databases
    FOR EACH ROW
    EXECUTE FUNCTION update_createdBy_column();

CREATE TRIGGER update_sybase_databases_updatedBy
    BEFORE UPDATE ON sybase_databases
    FOR EACH ROW
    EXECUTE FUNCTION update_updatedBy_column();

CREATE TRIGGER update_sybase_databases_deletedBy
    BEFORE UPDATE ON sybase_databases
    FOR EACH ROW
    EXECUTE FUNCTION update_deletedBy_column();

-- audit_trails triggers
CREATE TRIGGER update_audit_trails_createdAt
    BEFORE INSERT ON audit_trails
    FOR EACH ROW
    EXECUTE FUNCTION update_createdAt_column();