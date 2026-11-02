-- ============================================================================
-- Employee master schema for assetiq_db
--
-- tokeniq_db does NOT store employee details itself. It reads them from
-- assetiq_db.public.workday_employees through a postgres_fdw foreign table
-- (assetiq_fdw.workday_employees). Run this file once against assetiq_db:
--
--   createdb -U postgres assetiq_db
--   psql -U postgres -d assetiq_db -f db/assetiq_schema.sql
--   psql -U postgres -d assetiq_db -f db/seed_assetiq_employees.sql
--
-- Then create the foreign table in tokeniq_db (see db/README.md).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workday_employees (
    employee_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id character varying(100) NOT NULL UNIQUE,
    full_name character varying(200) NOT NULL,
    email_work character varying(255),
    email_home character varying(255),
    department character varying(150),
    division character varying(150),
    job_title character varying(150),
    employee_status character varying(30) DEFAULT 'Active'::character varying NOT NULL,
    manager_user_name character varying(50),
    manager_name character varying(200),
    location character varying(150),
    hire_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    last_synced_at timestamp with time zone DEFAULT now() NOT NULL,
    team_member_id character varying(64),
    manager_level_1_user_id bigint,
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
);

CREATE INDEX IF NOT EXISTS idx_workday_status
    ON public.workday_employees USING btree (employee_status);

CREATE INDEX IF NOT EXISTS idx_workday_user_id
    ON public.workday_employees USING btree (user_id);
