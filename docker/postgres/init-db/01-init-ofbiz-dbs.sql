-- Create OFBiz user with superuser privilege for seamless schema initialization
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'ofbiz') THEN
      CREATE ROLE ofbiz LOGIN PASSWORD 'ofbiz' SUPERUSER;
   ELSE
      ALTER ROLE ofbiz WITH PASSWORD 'ofbiz' SUPERUSER;
   END IF;
END
$do$;

-- Create OFBiz databases
SELECT 'CREATE DATABASE ofbiz OWNER ofbiz' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ofbiz')\gexec
SELECT 'CREATE DATABASE ofbizolap OWNER ofbiz' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ofbizolap')\gexec
SELECT 'CREATE DATABASE ofbiztenant OWNER ofbiz' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ofbiztenant')\gexec

-- Set schema ownership and privileges
\c ofbiz
ALTER SCHEMA public OWNER TO ofbiz;
GRANT ALL ON SCHEMA public TO ofbiz;

\c ofbizolap
ALTER SCHEMA public OWNER TO ofbiz;
GRANT ALL ON SCHEMA public TO ofbiz;

\c ofbiztenant
ALTER SCHEMA public OWNER TO ofbiz;
GRANT ALL ON SCHEMA public TO ofbiz;
