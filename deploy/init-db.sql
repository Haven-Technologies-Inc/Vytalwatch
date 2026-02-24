-- VitalWatch Database Initialization Script
-- This runs automatically when PostgreSQL container starts

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE vitalwatch_prod TO vitalwatch;
