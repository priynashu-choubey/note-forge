-- Create separate databases for each microservice
CREATE DATABASE auth_db;
CREATE DATABASE notes_db;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE auth_db TO noteforge;
GRANT ALL PRIVILEGES ON DATABASE notes_db TO noteforge;
