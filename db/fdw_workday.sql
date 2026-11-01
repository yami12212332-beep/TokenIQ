-- ============================================================================
-- Connect tokeniq_db to assetiq_db for employee / Workday details
--
-- Run this connected to **tokeniq_db** (after assetiq_db exists and contains
-- public.workday_employees):
--
--   psql -U postgres -d tokeniq_db -f db/fdw_workday.sql
--
-- Creates:
--   * postgres_fdw extension
--   * assetiq_fdw schema
--   * assetiq_server (remote DB: assetiq_db)
--   * user mapping for local role postgres -> remote role assetiq_reader
--   * foreign table assetiq_fdw.workday_employees
--
-- The backend rewrites `workday_employees` to `assetiq_fdw.workday_employees`
-- automatically, so the rest of the SQL keeps using the short name.
--
-- Adjust host/port/dbname/user/password below for your environment.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

CREATE SCHEMA IF NOT EXISTS assetiq_fdw;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_foreign_server WHERE srvname = 'assetiq_server') THEN
        CREATE SERVER assetiq_server
            FOREIGN DATA WRAPPER postgres_fdw
            OPTIONS (dbname 'assetiq_db', host 'localhost', port '5432');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_user_mappings
        WHERE srvname = 'assetiq_server' AND usename = 'postgres'
    ) THEN
        CREATE USER MAPPING FOR postgres
            SERVER assetiq_server
            OPTIONS ("user" 'assetiq_reader', password 'employee');
    END IF;
END
$$;

CREATE FOREIGN TABLE IF NOT EXISTS assetiq_fdw.workday_employees (
    employee_id bigint NOT NULL,
    user_id character varying(100) NOT NULL,
    full_name character varying(200) NOT NULL,
    email_work character varying(255),
    email_home character varying(255),
    department character varying(150),
    division character varying(150),
    job_title character varying(150),
    employee_status character varying(30) NOT NULL,
    manager_user_name character varying(50),
    manager_name character varying(200),
    location character varying(150),
    hire_date date,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    last_synced_at timestamp with time zone NOT NULL,
    team_member_id character varying(64),
    manager_level_1_user_id character varying(64),
    manager_level_1_user_name character varying(255),
    manager_level_2_user_id character varying(64),
    manager_level_2_user_name character varying(255),
    manager_level_3_user_id character varying(64),
    manager_level_3_user_name character varying(255),
    manager_level_4_user_id character varying(64),
    manager_level_4_user_name character varying(255),
    manager_level_5_user_id character varying(64),
    manager_level_5_user_name character varying(255),
    manager_level_6_user_id character varying(64),
    manager_level_6_user_name character varying(255),
    manager_level_7_user_id character varying(64),
    manager_level_7_user_name character varying(255),
    manager_level_8_user_id character varying(64),
    manager_level_8_user_name character varying(255),
    manager_level_9_user_id character varying(64),
    manager_level_9_user_name character varying(255)
)
SERVER assetiq_server
OPTIONS (schema_name 'public', table_name 'workday_employees');

-- Verify the link (should return 76 with the bundled seed):
--   SELECT count(*) FROM assetiq_fdw.workday_employees;
