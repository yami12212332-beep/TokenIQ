-- ============================================================================
-- DATABASE: tokeniq_db (Schema: simple.sql)
-- Matches the actual tokeniq_db schema (DB is source of truth).
-- Tables present in tokeniq_db: 5 base tables + 1 foreign table (workday_employees).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Anthropic Claude: User Usage Report (raw admin API shape)
-- Endpoint: GET /v1/organizations/analytics/user_usage_report
-- ----------------------------------------------------------------------------
CREATE TABLE claude_user_usage_report (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product VARCHAR(100),
    model VARCHAR(150),
    context_window VARCHAR(100),
    inference_geo VARCHAR(100),
    speed VARCHAR(50),
    slack_channel_id VARCHAR(150),
    slack_conversation_type VARCHAR(100),
    teams_channel_id VARCHAR(150),
    claude_tag_category VARCHAR(150),
    claude_tag_user_id VARCHAR(150),
    rbac_group_id VARCHAR(150),
    starting_at TIMESTAMP WITH TIME ZONE,
    ending_at TIMESTAMP WITH TIME ZONE,
    actor_type VARCHAR(50),
    actor_user_id VARCHAR(150),
    actor_name VARCHAR(200),
    actor_email_address VARCHAR(255),
    actor_email VARCHAR(255),
    actor_deleted BOOLEAN,
    uncached_input_tokens BIGINT,
    ephemeral_1h_input_tokens BIGINT,
    ephemeral_5m_input_tokens BIGINT,
    cache_read_input_tokens BIGINT,
    output_tokens BIGINT,
    total_tokens BIGINT,
    web_search_requests BIGINT,
    requests BIGINT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- ----------------------------------------------------------------------------
-- 2. Anthropic Claude: User Cost Report (raw admin API shape)
-- Endpoint: GET /v1/organizations/analytics/user_cost_report
-- ----------------------------------------------------------------------------
CREATE TABLE claude_user_cost_report (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product VARCHAR(100),
    model VARCHAR(150),
    context_window VARCHAR(100),
    inference_geo VARCHAR(100),
    speed VARCHAR(50),
    slack_channel_id VARCHAR(150),
    slack_conversation_type VARCHAR(100),
    teams_channel_id VARCHAR(150),
    claude_tag_category VARCHAR(150),
    claude_tag_user_id VARCHAR(150),
    rbac_group_id VARCHAR(150),
    starting_at TIMESTAMP WITH TIME ZONE,
    ending_at TIMESTAMP WITH TIME ZONE,
    actor_type VARCHAR(50),
    actor_user_id VARCHAR(150),
    actor_name VARCHAR(200),
    actor_email_address VARCHAR(255),
    actor_email VARCHAR(255),
    actor_deleted BOOLEAN,
    currency VARCHAR(10),
    amount NUMERIC(18, 6),
    list_amount NUMERIC(18, 6),
    cost_type VARCHAR(100),
    token_type VARCHAR(100),
    requests BIGINT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- ----------------------------------------------------------------------------
-- 3. Microsoft 365 Copilot: Usage User Detail
-- Endpoint: GET /copilot/reports/getMicrosoft365CopilotUsageUserDetail
-- (moved from assetiq_db into tokeniq_db)
-- ----------------------------------------------------------------------------
CREATE TABLE copilot_usage_user_detail (
    id SERIAL PRIMARY KEY,
    report_refresh_date DATE,
    user_principal_name VARCHAR(255),
    display_name VARCHAR(255),
    last_activity_date DATE,
    copilot_chat_last_activity_date DATE,
    microsoft_teams_copilot_last_activity_date DATE,
    word_copilot_last_activity_date DATE,
    excel_copilot_last_activity_date DATE,
    powerpoint_copilot_last_activity_date DATE,
    outlook_copilot_last_activity_date DATE,
    onenote_copilot_last_activity_date DATE,
    loop_copilot_last_activity_date DATE,
    report_period VARCHAR(20),
    prompts_submitted_all_apps BIGINT,
    prompts_submitted_copilot_chat_work BIGINT,
    prompts_submitted_copilot_chat_web BIGINT,
    active_usage_days_all_apps INT,
    edge_last_activity_date DATE,
    microsoft_365_app_last_activity_date DATE,
    copilot_chat_work_last_activity_date DATE,
    copilot_chat_web_last_activity_date DATE,
    snapshot_fetched_at DATE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. Microsoft 365 Copilot: User Count Summary
-- Endpoint: GET /reports/getMicrosoft365CopilotUserCountSummary(period='{period_value}')
-- ----------------------------------------------------------------------------
CREATE TABLE copilot_user_count_summary (
    id SERIAL PRIMARY KEY,
    report_refresh_date DATE,
    report_period VARCHAR(20),
    any_app_enabled_users BIGINT,
    any_app_active_users BIGINT,
    microsoft_teams_enabled_users BIGINT,
    microsoft_teams_active_users BIGINT,
    word_enabled_users BIGINT,
    word_active_users BIGINT,
    powerpoint_enabled_users BIGINT,
    powerpoint_active_users BIGINT,
    outlook_enabled_users BIGINT,
    outlook_active_users BIGINT,
    excel_enabled_users BIGINT,
    excel_active_users BIGINT,
    onenote_enabled_users BIGINT,
    onenote_active_users BIGINT,
    loop_enabled_users BIGINT,
    loop_active_users BIGINT,
    copilot_chat_enabled_users BIGINT,
    copilot_chat_active_users BIGINT,
    snapshot_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edge_enabled_users BIGINT,
    edge_active_users BIGINT,
    microsoft_365_copilot_enabled_users BIGINT,
    microsoft_365_copilot_active_users BIGINT,
    copilot_chat_work_enabled_users BIGINT,
    copilot_chat_work_active_users BIGINT,
    copilot_chat_web_enabled_users BIGINT,
    copilot_chat_web_active_users BIGINT,
    total_prompts_submitted BIGINT,
    average_prompts_submitted NUMERIC(12, 2)
);

-- ----------------------------------------------------------------------------
-- 5. Microsoft 365 Copilot: User Count Trend
-- Endpoint: GET /reports/getMicrosoft365CopilotUserCountTrend(period='{period_value}')
-- ----------------------------------------------------------------------------
CREATE TABLE copilot_user_count_trend (
    id SERIAL PRIMARY KEY,
    report_refresh_date DATE,
    report_period VARCHAR(20),
    report_date DATE,
    any_app_enabled_users BIGINT,
    any_app_active_users BIGINT,
    microsoft_teams_enabled_users BIGINT,
    microsoft_teams_active_users BIGINT,
    word_enabled_users BIGINT,
    word_active_users BIGINT,
    powerpoint_enabled_users BIGINT,
    powerpoint_active_users BIGINT,
    outlook_enabled_users BIGINT,
    outlook_active_users BIGINT,
    excel_enabled_users BIGINT,
    excel_active_users BIGINT,
    onenote_enabled_users BIGINT,
    onenote_active_users BIGINT,
    loop_enabled_users BIGINT,
    loop_active_users BIGINT,
    copilot_chat_enabled_users BIGINT,
    copilot_chat_active_users BIGINT,
    edge_enabled_users BIGINT,
    edge_active_users BIGINT,
    microsoft_365_app_enabled_users BIGINT,
    microsoft_365_app_active_users BIGINT,
    copilot_chat_work_enabled_users BIGINT,
    copilot_chat_work_active_users BIGINT,
    copilot_chat_web_enabled_users BIGINT,
    copilot_chat_web_active_users BIGINT,
    prompts_submitted BIGINT,
    snapshot_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. Workday Employees: HR Organization Hierarchy & Employee Master
-- NOTE: In tokeniq_db this is NOT a base table. It is a FOREIGN TABLE
-- (assetiq_fdw.workday_employees) created via postgres_fdw pointing at
-- assetiq_db.public.workday_employees. It is provisioned separately (FDW
-- server + user mapping + CREATE FOREIGN TABLE), not by this file.
-- Columns in the remote table (for reference):
--   employee_id BIGINT NOT NULL, user_id VARCHAR(100) NOT NULL,
--   full_name VARCHAR(200) NOT NULL, email_work VARCHAR(255), email_home VARCHAR(255),
--   department VARCHAR(150), division VARCHAR(150), job_title VARCHAR(150),
--   employee_status VARCHAR(30) NOT NULL, manager_user_name VARCHAR(50),
--   manager_name VARCHAR(200), location VARCHAR(150), hire_date DATE,
--   created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE,
--   last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL, team_member_id VARCHAR(64),
--   manager_level_1..9_user_id VARCHAR(64), manager_level_1..9_user_name VARCHAR(255)
-- ----------------------------------------------------------------------------
