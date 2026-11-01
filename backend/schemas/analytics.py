from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class TimePeriod(BaseModel):
    key: str
    label: str
    startDate: str
    endDate: str

class TimePeriodsResponse(BaseModel):
    monthly: List[TimePeriod]
    weekly: List[TimePeriod]
    default_monthly: str
    default_weekly: str

class HealthResponse(BaseModel):
    status: str
    database: str
    database_connected: bool
    schema_mode: str
    tables_used: List[str]
    query_engine: str

class ManagerSummaryModel(BaseModel):
    managerName: str
    managerUserName: str
    department: str
    division: str
    directReportsCount: int
    copilotLicensed: int
    copilotActive: int
    copilotPrompts: int
    copilotSpend: float
    claudeActive: int
    claudeTokens: int
    claudeSpend: float
    totalTeamSpend: float
    utilizationRate: float
    reclaimPotentialSpend: float

class DepartmentSummaryModel(BaseModel):
    name: str
    businessFunction: str
    headcount: int
    copilotLicenses: int
    copilotActive: int
    copilotSpend: float
    copilotPrompts: int
    claudeLicenses: int
    claudeActive: int
    claudeSpend: float
    claudeTokens: int
    totalSpend: float
    combinedActive: int
    combinedUtilization: float

class PlatformKPIsModel(BaseModel):
    licensedUsers: int
    activeUsers28d: int
    weeklyActiveUsers: int
    utilizationRate: float
    idleUsersCount: int
    lapsedUsersCount: int
    neverUsedCount: int
    totalMonthlySpend: float
    avgSpendPerActiveUser: float
    totalVolume: int
    avgVolumePerActive: int
    purchasedSeats: int
    rosterRestricted: Optional[bool] = None
    telemetrySource: Optional[str] = None
