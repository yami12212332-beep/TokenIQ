"""
SQLAlchemy Database Service for TokenIQ.
Provides AsyncEngine, async_sessionmaker, AsyncSession, and query execution helpers.
"""

import os
import re
import logging
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any, Union
from urllib.parse import urlsplit

from sqlalchemy import text, select, func, Date
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.sql import Executable

from services.periods import period_params, period_range, is_weekly

logger = logging.getLogger("backend.database")

COPILOT_SEAT_PRICE = float(os.getenv("COPILOT_SEAT_PRICE", "30.0"))
CLAUDE_BASE_SEAT_PRICE = float(os.getenv("CLAUDE_BASE_SEAT_PRICE", "20.0"))
CHATGPT_SEAT_PRICE = float(os.getenv("CHATGPT_SEAT_PRICE", "30.0"))


# Global SQLAlchemy engine and sessionmaker
engine: Optional[AsyncEngine] = None
session_factory: Optional[async_sessionmaker[AsyncSession]] = None

# Backward compatibility alias
pool: Optional[Any] = None


def _safe_target(url: str) -> str:
    """Log host/database only; never log credentials or passwords."""
    try:
        parsed = urlsplit(url)
        return (
            f"scheme={parsed.scheme} "
            f"host={parsed.hostname or 'unknown'} "
            f"port={parsed.port or 5432} "
            f"database={(parsed.path or '/').lstrip('/') or 'unknown'}"
        )
    except Exception:
        return "target=unparseable DATABASE_URL"


def get_sqlalchemy_database_url() -> str:
    """
    Construct or normalize a SQLAlchemy async database connection URL.
    Prefers postgresql+asyncpg:// or postgresql+psycopg://.
    """
    custom_url = os.getenv("DATABASE_URL", "").strip()
    if custom_url:
        # Convert legacy postgresql:// or postgres:// to postgresql+asyncpg://
        if custom_url.startswith("postgresql://"):
            return custom_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif custom_url.startswith("postgres://"):
            return custom_url.replace("postgres://", "postgresql+asyncpg://", 1)
        return custom_url

    db_host = os.getenv("DB_HOST", "127.0.0.1").strip()
    db_port = os.getenv("DB_PORT", "5432").strip()
    db_name = os.getenv("DB_NAME", "tokeniq_db").strip()
    db_user = os.getenv("DB_USER", "").strip()
    db_password = os.getenv("DB_PASSWORD", "").strip()

    if db_user and db_password and db_host and db_name:
        return f"postgresql+asyncpg://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

    # Default fallback / placeholder
    return f"postgresql+asyncpg://ai_admin:ai_password@{db_host}:{db_port}/{db_name}"


async def init_db_engine() -> Optional[AsyncEngine]:
    """Initialize SQLAlchemy AsyncEngine and session factory."""
    global engine, session_factory, pool

    db_url = get_sqlalchemy_database_url()
    logger.info("[SQLAlchemy Database] Initializing engine (%s)", _safe_target(db_url))

    try:
        candidate_engine = create_async_engine(
            db_url,
            pool_size=10,
            max_overflow=5,
            pool_timeout=10,
            pool_recycle=1800,
            pool_pre_ping=True,
            echo=False,
        )

        candidate_session_factory = async_sessionmaker(
            bind=candidate_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )

        # Test live connection
        async with candidate_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))

        engine = candidate_engine
        session_factory = candidate_session_factory
        pool = engine  # compatibility alias

        logger.info(
            "[SQLAlchemy Database] PostgreSQL connection verified successfully via SQLAlchemy (%s)",
            _safe_target(db_url),
        )
        return engine

    except Exception:
        logger.warning(
            "[SQLAlchemy Database] Could not connect to PostgreSQL (%s). "
            "Backend will run in graceful offline/demo mode.",
            _safe_target(db_url),
        )
        engine = None
        session_factory = None
        pool = None
        return None


# Backward compatibility aliases for lifespan and routes
async def init_db_pool() -> Optional[AsyncEngine]:
    return await init_db_engine()


async def close_db_pool():
    await close_db_engine()


async def close_db_engine():
    """Dispose of SQLAlchemy AsyncEngine."""
    global engine, session_factory, pool

    if engine is not None:
        await engine.dispose()
        engine = None
        session_factory = None
        pool = None
        logger.info("[SQLAlchemy Database] Closed SQLAlchemy engine.")


@asynccontextmanager
async def get_db_session():
    """Async context manager for yielding an AsyncSession."""
    if session_factory is None:
        raise RuntimeError("Database session factory is not initialized.")
    async with session_factory() as session:
        yield session


def _normalize_sql(sql: str) -> str:
    """
    Converts %(param_name)s syntax to SQLAlchemy :param_name syntax
    so that queries written in psycopg-style syntax execute smoothly with SQLAlchemy text().
    """
    return re.sub(r"%\(([a-zA-Z0-9_]+)\)s", r":\1", sql)


async def query_rows(
    sql_or_statement: Union[str, Executable],
    params: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Execute a query using SQLAlchemy and return rows as dictionaries.
    Supports either:
    1. A raw SQL string (with :param or %(param)s placeholders)
    2. A SQLAlchemy select/executable statement
    """
    if engine is None or session_factory is None:
        raise RuntimeError(
            "Database connection pool is unavailable. "
            "Check the [Database] startup log for the connection failure reason."
        )

    async with session_factory() as session:
        if isinstance(sql_or_statement, str):
            normalized_sql = _normalize_sql(sql_or_statement)
            params = dict(params or {})
            # Queries filtering by period use :period_start/:period_end (see services/periods.py);
            # derive them from period_key so callers only pass the key the UI sent.
            if ":period_start" in normalized_sql or ":period_end" in normalized_sql:
                params = {**period_params(params.get("period_key")), **params}
            
            # Prefer assetiq_fdw.workday_employees FDW table location; fallback if FDW schema is absent
            sql_fdw = re.sub(r'(?<!assetiq_fdw\.)\bworkday_employees\b', 'assetiq_fdw.workday_employees', normalized_sql)
            try:
                stmt = text(sql_fdw)
                result = await session.execute(stmt, params)
            except Exception:
                await session.rollback()
                stmt = text(normalized_sql)
                result = await session.execute(stmt, params)
        else:
            result = await session.execute(sql_or_statement, params or {})

        rows = result.mappings().all()
        return [dict(row) for row in rows]


async def get_existing_tables(schema: str = "public") -> set[str]:
    """Return the table/view names that currently exist in the given schema.

    Used by routes that join optional telemetry tables (Claude / ChatGPT) so a
    database that only has the Copilot tables still serves live data instead of
    falling back to demo records.
    """
    try:
        rows = await query_rows(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = :schema",
            {"schema": schema},
        )
        return {r["table_name"] for r in rows}
    except Exception:
        logger.warning("Could not read table list for schema %s", schema, exc_info=True)
        return set()


def _copilot_period_clause(period_key: str):
    """report_period label match, or the latest snapshot on/before the calendar period's end."""
    from sqlalchemy import or_
    from models.tables import CopilotUsageUserDetail as T

    _, end = period_range(period_key)
    if is_weekly(period_key):
        latest = select(func.max(func.cast(T.snapshot_fetched_at, Date))).scalar_subquery()
        return func.cast(T.snapshot_fetched_at, Date) == latest
    clause = T.report_period == period_key
    if end is not None:
        latest = (
            select(func.max(T.report_refresh_date))
            .where(T.report_refresh_date <= end)
            .scalar_subquery()
        )
        clause = or_(clause, T.report_refresh_date == latest)
    return clause


def _claude_period_clause(period_key: str):
    """report_period label match, or usage_date inside the calendar period."""
    from sqlalchemy import or_
    from models.tables import ClaudeUsageUserDetail as T

    start, end = period_range(period_key)
    if is_weekly(period_key):
        return T.report_refresh_date == select(func.max(T.report_refresh_date)).scalar_subquery()
    clause = T.report_period == period_key
    if start is not None:
        clause = or_(clause, T.usage_date.between(start, end))
    return clause


# ----------------------------------------------------------------------------
# Joined Query Builders: Workday Employees + Copilot / Claude
# Case-insensitive LOWER(email_work) matching with INNER JOIN strategy
# ----------------------------------------------------------------------------

async def get_joined_copilot_employees(
    session: Optional[AsyncSession] = None,
    period_key: Optional[str] = None,
    dept: Optional[str] = None,
    manager: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    INNER JOIN workday_employees with copilot_usage_user_detail
    on LOWER(workday_employees.email_work) == LOWER(copilot_usage_user_detail.user_principal_name).
    Filters exclusively to employees with active Copilot telemetry.
    """
    from models.tables import WorkdayEmployee, CopilotUsageUserDetail

    stmt = (
        select(
            WorkdayEmployee.employee_id,
            WorkdayEmployee.user_id,
            WorkdayEmployee.full_name,
            WorkdayEmployee.email_work,
            WorkdayEmployee.department,
            WorkdayEmployee.division,
            WorkdayEmployee.job_title,
            WorkdayEmployee.employee_status,
            WorkdayEmployee.manager_name,
            WorkdayEmployee.manager_user_name,
            WorkdayEmployee.manager_level_1_user_name,
            CopilotUsageUserDetail.id.label("copilot_id"),
            CopilotUsageUserDetail.user_principal_name,
            CopilotUsageUserDetail.report_period,
            CopilotUsageUserDetail.last_activity_date,
            CopilotUsageUserDetail.prompts_submitted_all_apps,
            CopilotUsageUserDetail.prompts_submitted_copilot_chat_work,
            CopilotUsageUserDetail.prompts_submitted_copilot_chat_web,
            CopilotUsageUserDetail.active_usage_days_all_apps,
            CopilotUsageUserDetail.copilot_chat_last_activity_date,
            CopilotUsageUserDetail.microsoft_teams_copilot_last_activity_date,
            CopilotUsageUserDetail.word_copilot_last_activity_date,
            CopilotUsageUserDetail.excel_copilot_last_activity_date,
            CopilotUsageUserDetail.powerpoint_copilot_last_activity_date,
        )
        .join(
            CopilotUsageUserDetail,
            func.lower(WorkdayEmployee.email_work) == func.lower(CopilotUsageUserDetail.user_principal_name),
        )
    )

    if period_key:
        stmt = stmt.where(_copilot_period_clause(period_key))
    if dept and dept != "ALL":
        stmt = stmt.where(WorkdayEmployee.department == dept)
    if manager and manager != "ALL":
        stmt = stmt.where(
            (WorkdayEmployee.manager_name == manager) | (WorkdayEmployee.manager_user_name == manager)
        )

    stmt = stmt.order_by(CopilotUsageUserDetail.prompts_submitted_all_apps.desc())

    if session is not None:
        result = await session.execute(stmt)
        return [dict(row) for row in result.mappings().all()]

    async with get_db_session() as auto_session:
        result = await auto_session.execute(stmt)
        return [dict(row) for row in result.mappings().all()]


async def get_joined_claude_employees(
    session: Optional[AsyncSession] = None,
    period_key: Optional[str] = None,
    dept: Optional[str] = None,
    manager: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    INNER JOIN workday_employees with claude_usage_user_detail
    on LOWER(workday_employees.email_work) == LOWER(claude_usage_user_detail.email).
    Left joins claude_cost_user_detail on user_id, report_period, and model.
    """
    from models.tables import WorkdayEmployee, ClaudeUsageUserDetail, ClaudeCostUserDetail

    stmt = (
        select(
            WorkdayEmployee.employee_id,
            WorkdayEmployee.user_id,
            WorkdayEmployee.full_name,
            WorkdayEmployee.email_work,
            WorkdayEmployee.department,
            WorkdayEmployee.division,
            WorkdayEmployee.job_title,
            WorkdayEmployee.manager_name,
            WorkdayEmployee.manager_level_1_user_name,
            ClaudeUsageUserDetail.id.label("claude_usage_id"),
            ClaudeUsageUserDetail.email.label("claude_email"),
            ClaudeUsageUserDetail.report_period,
            ClaudeUsageUserDetail.model,
            ClaudeUsageUserDetail.usage_date,
            ClaudeUsageUserDetail.input_tokens,
            ClaudeUsageUserDetail.output_tokens,
            ClaudeUsageUserDetail.cache_read_input_tokens,
            ClaudeUsageUserDetail.cache_creation_input_tokens,
            ClaudeUsageUserDetail.request_count,
            ClaudeCostUserDetail.total_cost_usd,
        )
        .join(
            ClaudeUsageUserDetail,
            func.lower(WorkdayEmployee.email_work) == func.lower(ClaudeUsageUserDetail.email),
        )
        .outerjoin(
            ClaudeCostUserDetail,
            (ClaudeUsageUserDetail.user_id == ClaudeCostUserDetail.user_id)
            & (ClaudeUsageUserDetail.report_period == ClaudeCostUserDetail.report_period)
            & (ClaudeUsageUserDetail.model == ClaudeCostUserDetail.model)
            & (ClaudeUsageUserDetail.usage_date == ClaudeCostUserDetail.cost_date),
        )
    )

    if period_key:
        stmt = stmt.where(_claude_period_clause(period_key))
    if dept and dept != "ALL":
        stmt = stmt.where(WorkdayEmployee.department == dept)
    if manager and manager != "ALL":
        stmt = stmt.where(
            (WorkdayEmployee.manager_name == manager) | (WorkdayEmployee.manager_user_name == manager)
        )

    stmt = stmt.order_by(ClaudeUsageUserDetail.input_tokens.desc())

    if session is not None:
        result = await session.execute(stmt)
        return [dict(row) for row in result.mappings().all()]

    async with get_db_session() as auto_session:
        result = await auto_session.execute(stmt)
        return [dict(row) for row in result.mappings().all()]


async def get_joined_active_ai_employees(
    session: Optional[AsyncSession] = None,
    period_key: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Returns unified active AI employees by joining workday_employees with both
    Copilot (via user_principal_name) and Claude (via email) on LOWER(email_work).
    Filters to employees with recorded activity in either platform.
    """
    from models.tables import WorkdayEmployee, CopilotUsageUserDetail, ClaudeUsageUserDetail

    # Subqueries for aggregated activity per email
    cp_subq = (
        select(
            func.lower(CopilotUsageUserDetail.user_principal_name).label("email"),
            func.max(CopilotUsageUserDetail.last_activity_date).label("last_active_date"),
            func.sum(func.coalesce(CopilotUsageUserDetail.prompts_submitted_all_apps, 0)).label("prompts"),
            func.max(func.coalesce(CopilotUsageUserDetail.active_usage_days_all_apps, 0)).label("active_days"),
        )
    )
    if period_key:
        cp_subq = cp_subq.where(_copilot_period_clause(period_key))
    cp_subq = cp_subq.group_by(func.lower(CopilotUsageUserDetail.user_principal_name)).subquery()

    cl_subq = (
        select(
            func.lower(ClaudeUsageUserDetail.email).label("email"),
            func.max(ClaudeUsageUserDetail.usage_date).label("last_active_date"),
            func.sum(func.coalesce(ClaudeUsageUserDetail.input_tokens, 0) + func.coalesce(ClaudeUsageUserDetail.output_tokens, 0)).label("total_tokens"),
            func.sum(func.coalesce(ClaudeUsageUserDetail.request_count, 0)).label("requests"),
        )
    )
    if period_key:
        cl_subq = cl_subq.where(_claude_period_clause(period_key))
    cl_subq = cl_subq.group_by(func.lower(ClaudeUsageUserDetail.email)).subquery()

    stmt = (
        select(
            WorkdayEmployee.employee_id,
            WorkdayEmployee.full_name,
            WorkdayEmployee.email_work,
            WorkdayEmployee.department,
            WorkdayEmployee.division,
            WorkdayEmployee.job_title,
            WorkdayEmployee.manager_name,
            cp_subq.c.prompts.label("copilot_prompts"),
            cp_subq.c.active_days.label("copilot_active_days"),
            cp_subq.c.last_active_date.label("copilot_last_active"),
            cl_subq.c.total_tokens.label("claude_tokens"),
            cl_subq.c.requests.label("claude_requests"),
            cl_subq.c.last_active_date.label("claude_last_active"),
        )
        .outerjoin(cp_subq, func.lower(WorkdayEmployee.email_work) == cp_subq.c.email)
        .outerjoin(cl_subq, func.lower(WorkdayEmployee.email_work) == cl_subq.c.email)
        .where(
            (cp_subq.c.email.is_not(None)) | (cl_subq.c.email.is_not(None))
        )
        .order_by(WorkdayEmployee.department, WorkdayEmployee.full_name)
    )

    if session is not None:
        result = await session.execute(stmt)
        return [dict(row) for row in result.mappings().all()]

    async with get_db_session() as auto_session:
        result = await auto_session.execute(stmt)
        return [dict(row) for row in result.mappings().all()]

