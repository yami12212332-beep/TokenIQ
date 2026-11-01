"""
Database table schemas and entity definitions for tokeniq_db
"""
from typing import Optional,Literal
from datetime import date, datetime
from pydantic import BaseModel

class WorkdayEmployee(BaseModel):
    employee_id: str
    user_id: Optional[str] = None
    email_work: str
    full_name: str
    department: str
    division: str
    job_title: str
    manager_name: Optional[str] = None
    manager_user_name: Optional[str] = None
    employee_status: Literal["Active", "ACTIVE"] = "Active"

class CopilotUserDetail(BaseModel):
    id: Optional[int] = None
    report_refresh_date: Optional[date] = None
    user_principal_name: str
    display_name: Optional[str] = None
    last_activity_date: Optional[date] = None
    report_period: str
    prompts_submitted_all_apps: int = 0
    active_usage_days_all_apps: int = 0
    snapshot_fetched_at: Optional[datetime] = None

class ClaudeUsageDetail(BaseModel):
    id: Optional[int] = None
    report_period: str
    usage_date: Optional[date] = None
    user_id: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_input_tokens: int = 0
    cache_creation_input_tokens: int = 0
    request_count: int = 0

class ClaudeCostDetail(BaseModel):
    id: Optional[int] = None
    report_period: str
    cost_date: Optional[date] = None
    user_id: str
    email: Optional[str] = None
    model: str
    total_cost_usd: float = 0.0
