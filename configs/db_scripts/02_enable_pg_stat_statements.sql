-- Enable essential performance monitoring extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_buffercache;

-- Grant necessary permissions to view performance statistics
-- Uncomment the following lines if you need to grant access to specific users
-- GRANT SELECT ON pg_stat_statements TO your_username;
-- GRANT SELECT ON pg_buffercache TO your_username;
-- GRANT EXECUTE ON FUNCTION pg_stat_statements_reset() TO your_username;
