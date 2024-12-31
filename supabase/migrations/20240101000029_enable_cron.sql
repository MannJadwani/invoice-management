-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Allow postgres user to use cron
ALTER DEFAULT PRIVILEGES IN SCHEMA cron GRANT EXECUTE ON FUNCTIONS TO postgres; 