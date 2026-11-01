"""
SQLAlchemy Table Models for all 7 tables in simple.sql:
1. CopilotUsageUserDetail (copilot_usage_user_detail)
2. CopilotUserCountSummary (copilot_user_count_summary)
3. CopilotUserCountTrend (copilot_user_count_trend)
4. ClaudeUsageUserDetail (claude_usage_user_detail)
5. ClaudeCostUserDetail (claude_cost_user_detail)
6. ClaudeOrganizationUser (claude_organization_users)
7. WorkdayEmployee (workday_employees)
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, foreign, remote


class Base(DeclarativeBase):
    """Base declarative class for all tokeniq_db SQLAlchemy models."""

    def to_dict(self) -> Dict[str, Any]:
        """Convert model instance to dictionary representation."""
        result = {}
        for column in self.__table__.columns:
            val = getattr(self, column.name)
            if isinstance(val, (date, datetime)):
                result[column.name] = val.isoformat()
            elif isinstance(val, Decimal):
                result[column.name] = float(val)
            else:
                result[column.name] = val
        return result


# ----------------------------------------------------------------------------
# 1. Microsoft 365 Copilot: Usage User Detail
# Table: copilot_usage_user_detail
# ----------------------------------------------------------------------------
class CopilotUsageUserDetail(Base):
    __tablename__ = "copilot_usage_user_detail"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_refresh_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    user_principal_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    copilot_chat_last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    microsoft_teams_copilot_last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    word_copilot_last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    excel_copilot_last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    powerpoint_copilot_last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    outlook_copilot_last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    onenote_copilot_last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    loop_copilot_last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    report_period: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    prompts_submitted_all_apps: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    prompts_submitted_copilot_chat_work: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    prompts_submitted_copilot_chat_web: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    active_usage_days_all_apps: Mapped[Optional[int]] = mapped_column(Integer, default=0, nullable=True)
    edge_last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    microsoft_365_app_last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    copilot_chat_work_last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    copilot_chat_web_last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    snapshot_fetched_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=True,
    )

    # Relationship to WorkdayEmployee via case-insensitive email match
    employee: Mapped[Optional["WorkdayEmployee"]] = relationship(
        "WorkdayEmployee",
        primaryjoin="func.lower(foreign(CopilotUsageUserDetail.user_principal_name)) == func.lower(remote(WorkdayEmployee.email_work))",
        viewonly=True,
        uselist=False,
        back_populates="copilot_usage",
    )


# ----------------------------------------------------------------------------
# 2. Microsoft 365 Copilot: User Count Summary
# Table: copilot_user_count_summary
# ----------------------------------------------------------------------------
class CopilotUserCountSummary(Base):
    __tablename__ = "copilot_user_count_summary"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_refresh_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    report_period: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    any_app_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    any_app_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    microsoft_teams_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    microsoft_teams_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    word_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    word_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    powerpoint_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    powerpoint_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    outlook_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    outlook_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    excel_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    excel_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    onenote_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    onenote_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    loop_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    loop_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    copilot_chat_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    copilot_chat_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    snapshot_fetched_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=True,
    )


# ----------------------------------------------------------------------------
# 3. Microsoft 365 Copilot: User Count Trend
# Table: copilot_user_count_trend
# ----------------------------------------------------------------------------
class CopilotUserCountTrend(Base):
    __tablename__ = "copilot_user_count_trend"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_refresh_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    report_period: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    report_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    any_app_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    any_app_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    microsoft_teams_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    microsoft_teams_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    word_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    word_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    powerpoint_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    powerpoint_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    outlook_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    outlook_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    excel_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    excel_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    onenote_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    onenote_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    loop_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    loop_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    copilot_chat_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    copilot_chat_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    edge_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    edge_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    microsoft_365_app_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    microsoft_365_app_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    copilot_chat_work_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    copilot_chat_work_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    copilot_chat_web_enabled_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    copilot_chat_web_active_users: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    prompts_submitted: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    snapshot_fetched_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=True,
    )


# ----------------------------------------------------------------------------
# 4. Anthropic Claude: User Usage Report
# Table: claude_usage_user_detail
# ----------------------------------------------------------------------------
class ClaudeUsageUserDetail(Base):
    __tablename__ = "claude_usage_user_detail"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_refresh_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    report_period: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    usage_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    input_tokens: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    output_tokens: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    cache_read_input_tokens: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    cache_creation_input_tokens: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    request_count: Mapped[Optional[int]] = mapped_column(Integer, default=0, nullable=True)

    # Relationship to WorkdayEmployee via case-insensitive email match
    employee: Mapped[Optional["WorkdayEmployee"]] = relationship(
        "WorkdayEmployee",
        primaryjoin="func.lower(foreign(ClaudeUsageUserDetail.email)) == func.lower(remote(WorkdayEmployee.email_work))",
        viewonly=True,
        uselist=False,
        back_populates="claude_usage",
    )


# ----------------------------------------------------------------------------
# 5. Anthropic Claude: User Cost Report
# Table: claude_cost_user_detail
# ----------------------------------------------------------------------------
class ClaudeCostUserDetail(Base):
    __tablename__ = "claude_cost_user_detail"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_refresh_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    report_period: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    cost_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=True)
    input_cost_usd: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), default=0.0, nullable=True)
    output_cost_usd: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), default=0.0, nullable=True)
    cache_read_cost_usd: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), default=0.0, nullable=True)
    cache_creation_cost_usd: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), default=0.0, nullable=True)
    total_cost_usd: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), default=0.0, nullable=True)

    # Relationship to WorkdayEmployee via case-insensitive email match
    employee: Mapped[Optional["WorkdayEmployee"]] = relationship(
        "WorkdayEmployee",
        primaryjoin="func.lower(foreign(ClaudeCostUserDetail.email)) == func.lower(remote(WorkdayEmployee.email_work))",
        viewonly=True,
        uselist=False,
        back_populates="claude_costs",
    )


# ----------------------------------------------------------------------------
# 6. Anthropic Claude: Organization Users (Roster)
# Table: claude_organization_users
# ----------------------------------------------------------------------------
class ClaudeOrganizationUser(Base):
    __tablename__ = "claude_organization_users"

    user_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    membership_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    license_tier: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    last_active_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationship to WorkdayEmployee via case-insensitive email match
    employee: Mapped[Optional["WorkdayEmployee"]] = relationship(
        "WorkdayEmployee",
        primaryjoin="func.lower(foreign(ClaudeOrganizationUser.email)) == func.lower(remote(WorkdayEmployee.email_work))",
        viewonly=True,
        uselist=False,
        back_populates="claude_roster",
    )


# ----------------------------------------------------------------------------
# 7. Workday Employees: HR Organization Hierarchy & Employee Master
# Table: workday_employees
# ----------------------------------------------------------------------------
class WorkdayEmployee(Base):
    __tablename__ = "workday_employees"
    __table_args__ = {"schema": "assetiq_fdw"}

    employee_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email_work: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email_home: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    division: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    job_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    employee_status: Mapped[Optional[str]] = mapped_column(String(64), default="ACTIVE", nullable=True)
    manager_user_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    manager_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    hire_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=True
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=True
    )
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    team_member_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Manager hierarchy (Level 1 through 9)
    manager_level_1_user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    manager_level_1_user_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    manager_level_2_user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    manager_level_2_user_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    manager_level_3_user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    manager_level_3_user_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    manager_level_4_user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    manager_level_4_user_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    manager_level_5_user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    manager_level_5_user_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    manager_level_6_user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    manager_level_6_user_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    manager_level_7_user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    manager_level_7_user_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    manager_level_8_user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    manager_level_8_user_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    manager_level_9_user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    manager_level_9_user_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # ------------------------------------------------------------------------
    # Relationships to Microsoft Copilot & Anthropic Claude Telemetry
    # Joined on case-insensitive LOWER(email_work) matching
    # ------------------------------------------------------------------------
    copilot_usage: Mapped[List["CopilotUsageUserDetail"]] = relationship(
        "CopilotUsageUserDetail",
        primaryjoin="func.lower(foreign(CopilotUsageUserDetail.user_principal_name)) == func.lower(WorkdayEmployee.email_work)",
        viewonly=True,
        back_populates="employee",
    )

    claude_usage: Mapped[List["ClaudeUsageUserDetail"]] = relationship(
        "ClaudeUsageUserDetail",
        primaryjoin="func.lower(foreign(ClaudeUsageUserDetail.email)) == func.lower(WorkdayEmployee.email_work)",
        viewonly=True,
        back_populates="employee",
    )

    claude_costs: Mapped[List["ClaudeCostUserDetail"]] = relationship(
        "ClaudeCostUserDetail",
        primaryjoin="func.lower(foreign(ClaudeCostUserDetail.email)) == func.lower(WorkdayEmployee.email_work)",
        viewonly=True,
        back_populates="employee",
    )

    claude_roster: Mapped[Optional["ClaudeOrganizationUser"]] = relationship(
        "ClaudeOrganizationUser",
        primaryjoin="func.lower(foreign(ClaudeOrganizationUser.email)) == func.lower(WorkdayEmployee.email_work)",
        viewonly=True,
        uselist=False,
        back_populates="employee",
    )

    chatgpt_usage: Mapped[List["ChatGPTUsageUserDetail"]] = relationship(
        "ChatGPTUsageUserDetail",
        primaryjoin="func.lower(foreign(ChatGPTUsageUserDetail.email)) == func.lower(WorkdayEmployee.email_work)",
        viewonly=True,
        back_populates="employee",
    )

    chatgpt_costs: Mapped[List["ChatGPTCostUserDetail"]] = relationship(
        "ChatGPTCostUserDetail",
        primaryjoin="func.lower(foreign(ChatGPTCostUserDetail.email)) == func.lower(WorkdayEmployee.email_work)",
        viewonly=True,
        back_populates="employee",
    )


# ----------------------------------------------------------------------------
# 8. OpenAI ChatGPT: User Usage Report
# Table: chatgpt_usage_user_detail
# ----------------------------------------------------------------------------
class ChatGPTUsageUserDetail(Base):
    __tablename__ = "chatgpt_usage_user_detail"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_refresh_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    report_period: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    usage_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    input_tokens: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    output_tokens: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    cached_tokens: Mapped[Optional[int]] = mapped_column(BigInteger, default=0, nullable=True)
    request_count: Mapped[Optional[int]] = mapped_column(Integer, default=0, nullable=True)

    # Relationship to WorkdayEmployee via case-insensitive email match
    employee: Mapped[Optional["WorkdayEmployee"]] = relationship(
        "WorkdayEmployee",
        primaryjoin="func.lower(foreign(ChatGPTUsageUserDetail.email)) == func.lower(remote(WorkdayEmployee.email_work))",
        viewonly=True,
        uselist=False,
        back_populates="chatgpt_usage",
    )


# ----------------------------------------------------------------------------
# 9. OpenAI ChatGPT: User Cost Report
# Table: chatgpt_cost_user_detail
# ----------------------------------------------------------------------------
class ChatGPTCostUserDetail(Base):
    __tablename__ = "chatgpt_cost_user_detail"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_refresh_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    report_period: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    cost_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=True)
    input_cost_usd: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), default=0.0, nullable=True)
    output_cost_usd: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), default=0.0, nullable=True)
    cached_cost_usd: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), default=0.0, nullable=True)
    total_cost_usd: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), default=0.0, nullable=True)

    # Relationship to WorkdayEmployee via case-insensitive email match
    employee: Mapped[Optional["WorkdayEmployee"]] = relationship(
        "WorkdayEmployee",
        primaryjoin="func.lower(foreign(ChatGPTCostUserDetail.email)) == func.lower(remote(WorkdayEmployee.email_work))",
        viewonly=True,
        uselist=False,
        back_populates="chatgpt_costs",
    )


# Grouped registry of all models for easy reflection, introspection and bulk queries
ALL_TABLE_MODELS = [
    CopilotUsageUserDetail,
    CopilotUserCountSummary,
    CopilotUserCountTrend,
    ClaudeUsageUserDetail,
    ClaudeCostUserDetail,
    ClaudeOrganizationUser,
    WorkdayEmployee,
    ChatGPTUsageUserDetail,
    ChatGPTCostUserDetail,
]

