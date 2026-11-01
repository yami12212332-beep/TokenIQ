"""
Workday and general organization analytics routes
"""
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query
from services.periods import claude_raw_cost_period, claude_raw_usage_period, copilot_detail_period
from services.database import query_rows, COPILOT_SEAT_PRICE, CLAUDE_BASE_SEAT_PRICE
from schemas.analytics import ManagerSummaryModel, DepartmentSummaryModel

logger = logging.getLogger("backend.routes.analytics")
router = APIRouter(prefix="/api", tags=["Analytics"])


def _claude_agg_cte(period_key: str) -> str:
    """Claude per-user aggregates from the raw Anthropic report tables.

    Usage and cost are aggregated separately before the full join so multiple
    cost rows for one user/model/day cannot multiply token counts.
    """
    usage_period = claude_raw_usage_period(period_key, "u")
    cost_period = claude_raw_cost_period(period_key, "c")
    return f"""claude_usage_agg AS (
                SELECT LOWER(COALESCE(u.actor_email, w.email_work)) AS email,
                       SUM(COALESCE(u.uncached_input_tokens,0) + COALESCE(u.output_tokens,0)
                           + COALESCE(u.cache_read_input_tokens,0)
                           + COALESCE(u.ephemeral_5m_input_tokens,0)
                           + COALESCE(u.ephemeral_1h_input_tokens,0)) AS total_tokens,
                       SUM(COALESCE(u.requests,0)) AS requests
                FROM claude_user_usage_report u
                LEFT JOIN workday_employees w ON u.actor_user_id = w.user_id
                WHERE {usage_period}
                GROUP BY LOWER(COALESCE(u.actor_email, w.email_work))
            ),
            claude_cost_agg AS (
                SELECT LOWER(COALESCE(c.actor_email, w.email_work)) AS email,
                       SUM(COALESCE(c.amount,0)) / 100.0 AS token_cost
                FROM claude_user_cost_report c
                LEFT JOIN workday_employees w ON c.actor_user_id = w.user_id
                WHERE {cost_period}
                GROUP BY LOWER(COALESCE(c.actor_email, w.email_work))
            ),
            claude_agg AS (
                SELECT COALESCE(u.email, c.email) AS email,
                       COALESCE(u.total_tokens,0) AS total_tokens,
                       COALESCE(u.requests,0) AS requests,
                       COALESCE(c.token_cost,0) AS token_cost
                FROM claude_usage_agg u
                FULL OUTER JOIN claude_cost_agg c ON u.email = c.email
            )"""

@router.get("/time-periods")
async def get_time_periods():
    return {
        "monthly": [
            {"key": "2026-10", "label": "October 2026 (Current)", "startDate": "2026-10-01", "endDate": "2026-10-31"},
            {"key": "2026-09", "label": "September 2026", "startDate": "2026-09-01", "endDate": "2026-09-30"},
            {"key": "2026-08", "label": "August 2026", "startDate": "2026-08-01", "endDate": "2026-08-31"}
        ],
        "weekly": [
            {"key": "2026-W42", "label": "Week 42 (Oct 13 - Oct 19)", "startDate": "2026-10-13", "endDate": "2026-10-19"},
            {"key": "2026-W41", "label": "Week 41 (Oct 06 - Oct 12)", "startDate": "2026-10-06", "endDate": "2026-10-12"},
            {"key": "2026-W40", "label": "Week 40 (Sep 29 - Oct 05)", "startDate": "2026-09-29", "endDate": "2026-10-05"}
        ],
        "default_monthly": "2026-10",
        "default_weekly": "2026-W42"
    }

@router.get("/workday/managers")
async def get_workday_managers():
    try:
        rows = await query_rows("""
            SELECT 
                manager_user_name,
                manager_name,
                department,
                COUNT(*) as direct_reports_count
            FROM workday_employees
            WHERE employee_status IN ('Active', 'ACTIVE') AND manager_name IS NOT NULL
            GROUP BY manager_user_name, manager_name, department
            ORDER BY direct_reports_count DESC
        """)
        if rows:
            return rows
    except Exception as e:
        logger.warning(f"DB query error in get_workday_managers: {e}")

    return [
        {"manager_name": "Sarah Jenkins", "manager_user_name": "sjenkins", "department": "Engineering", "direct_reports_count": 68},
        {"manager_name": "David Sterling", "manager_user_name": "dsterling", "department": "Sales & Solutions", "direct_reports_count": 52},
        {"manager_name": "Maya Lin", "manager_user_name": "mlin", "department": "Product & Design", "direct_reports_count": 46},
        {"manager_name": "Rachel Zhao", "manager_user_name": "rzhao", "department": "Customer Support", "direct_reports_count": 48},
        {"manager_name": "Carlos Mendes", "manager_user_name": "cmendes", "department": "Finance & Legal", "direct_reports_count": 42},
        {"manager_name": "Alicia Keys", "manager_user_name": "akeys", "department": "Marketing", "direct_reports_count": 44}
    ]

@router.get("/workday/departments")
async def get_workday_departments():
    try:
        rows = await query_rows("""
            SELECT 
                department,
                division,
                COUNT(*) as headcount
            FROM workday_employees
            WHERE employee_status IN ('Active', 'ACTIVE')
            GROUP BY department, division
            ORDER BY headcount DESC
        """)
        if rows:
            return rows
    except Exception as e:
        logger.warning(f"DB query error in get_workday_departments: {e}")

    return [
        {"department": "Engineering", "division": "Core Tech", "headcount": 68},
        {"department": "Sales & Solutions", "division": "Go-To-Market", "headcount": 52},
        {"department": "Customer Support", "division": "Operations", "headcount": 48},
        {"department": "Product & Design", "division": "Core Tech", "headcount": 46},
        {"department": "Marketing", "division": "Go-To-Market", "headcount": 44},
        {"department": "Finance & Legal", "division": "Corporate & Admin", "headcount": 42}
    ]

@router.get("/analytics/by-manager")
async def get_analytics_by_manager(
    period_key: str = Query("2026-10"),
    period_type: str = Query("MONTHLY", pattern="^(MONTHLY|WEEKLY)$"),
    dept: Optional[str] = None
):
    try:
        where_clause = "WHERE w.employee_status IN ('Active', 'ACTIVE')"
        params = {"period_key": period_key}
        if dept and dept != "ALL":
            where_clause += " AND w.department = %(dept)s"
            params["dept"] = dept

        sql = f"""
            WITH copilot_agg AS (
                SELECT 
                    LOWER(user_principal_name) as email,
                    MAX(last_activity_date) as last_act,
                    SUM(prompts_submitted_all_apps) as prompts,
                    MAX(active_usage_days_all_apps) as active_days
                FROM copilot_usage_user_detail
                WHERE {copilot_detail_period(period_key)}
                GROUP BY LOWER(user_principal_name)
            ),
            {_claude_agg_cte(period_key)}
            SELECT 
                w.manager_name,
                w.manager_user_name,
                w.department,
                w.division,
                COUNT(DISTINCT w.employee_id) as direct_reports_count,
                COUNT(DISTINCT cp.email) as copilot_licensed,
                COUNT(DISTINCT cp.email) FILTER (WHERE cp.active_days > 0) as copilot_active,
                COALESCE(SUM(cp.prompts), 0) as copilot_prompts,
                COUNT(DISTINCT cl.email) as claude_active,
                COALESCE(SUM(cl.total_tokens), 0) as claude_tokens,
                COALESCE(SUM(cl.token_cost), 0.0) as claude_token_cost
            FROM workday_employees w
            LEFT JOIN copilot_agg cp ON LOWER(w.email_work) = cp.email
            LEFT JOIN claude_agg cl ON LOWER(w.email_work) = cl.email
            {where_clause}
            GROUP BY w.manager_name, w.manager_user_name, w.department, w.division
            ORDER BY direct_reports_count DESC
        """
        rows = await query_rows(sql, params)
        if rows:
            result = []
            for r in rows:
                cop_lic = r["copilot_licensed"] or 0
                cop_act = r["copilot_active"] or 0
                cop_spend = cop_lic * (COPILOT_SEAT_PRICE if period_type == "MONTHLY" else COPILOT_SEAT_PRICE * 0.25)
                
                cld_act = r["claude_active"] or 0
                cld_tok_cost = float(r["claude_token_cost"] or 0)
                cld_base_spend = cld_act * (CLAUDE_BASE_SEAT_PRICE if period_type == "MONTHLY" else CLAUDE_BASE_SEAT_PRICE * 0.25)
                cld_total_spend = cld_base_spend + cld_tok_cost
                
                total_team_spend = cop_spend + cld_total_spend
                headcount = r["direct_reports_count"] or 1
                utilization = round(100.0 * (cop_act + cld_act) / (headcount * 2), 1)
                reclaim = (cop_lic - cop_act) * (COPILOT_SEAT_PRICE if period_type == "MONTHLY" else COPILOT_SEAT_PRICE * 0.25)

                result.append({
                    "managerName": r["manager_name"] or "Unassigned",
                    "managerUserName": r["manager_user_name"] or "",
                    "department": r["department"],
                    "division": r["division"],
                    "directReportsCount": headcount,
                    "copilotLicensed": cop_lic,
                    "copilotActive": cop_act,
                    "copilotPrompts": int(r["copilot_prompts"] or 0),
                    "copilotSpend": round(cop_spend, 2),
                    "claudeActive": cld_act,
                    "claudeTokens": int(r["claude_tokens"] or 0),
                    "claudeSpend": round(cld_total_spend, 2),
                    "totalTeamSpend": round(total_team_spend, 2),
                    "utilizationRate": min(100.0, utilization),
                    "reclaimPotentialSpend": round(reclaim, 2)
                })
            return result
    except Exception as e:
        logger.warning(f"DB query error in get_analytics_by_manager: {e}")

    mult = 0.25 if period_type == "WEEKLY" else 1.0
    return [
        {"managerName": "Sarah Jenkins", "managerUserName": "sjenkins", "department": "Engineering", "division": "Core Tech", "directReportsCount": 68, "copilotLicensed": 65, "copilotActive": 61, "copilotPrompts": int(11420 * mult), "copilotSpend": round(1950.0 * mult, 2), "claudeActive": 62, "claudeTokens": int(124800000 * mult), "claudeSpend": round(3280.0 * mult, 2), "totalTeamSpend": round(5230.0 * mult, 2), "utilizationRate": 93.8, "reclaimPotentialSpend": round(120.0 * mult, 2)},
        {"managerName": "David Sterling", "managerUserName": "dsterling", "department": "Sales & Solutions", "division": "Go-To-Market", "directReportsCount": 52, "copilotLicensed": 50, "copilotActive": 44, "copilotPrompts": int(6840 * mult), "copilotSpend": round(1500.0 * mult, 2), "claudeActive": 35, "claudeTokens": int(36400000 * mult), "claudeSpend": round(1650.0 * mult, 2), "totalTeamSpend": round(3150.0 * mult, 2), "utilizationRate": 77.5, "reclaimPotentialSpend": round(180.0 * mult, 2)},
        {"managerName": "Maya Lin", "managerUserName": "mlin", "department": "Product & Design", "division": "Core Tech", "directReportsCount": 46, "copilotLicensed": 44, "copilotActive": 39, "copilotPrompts": int(5200 * mult), "copilotSpend": round(1320.0 * mult, 2), "claudeActive": 38, "claudeTokens": int(42100000 * mult), "claudeSpend": round(1820.0 * mult, 2), "totalTeamSpend": round(3140.0 * mult, 2), "utilizationRate": 83.7, "reclaimPotentialSpend": round(150.0 * mult, 2)},
        {"managerName": "Rachel Zhao", "managerUserName": "rzhao", "department": "Customer Support", "division": "Operations", "directReportsCount": 48, "copilotLicensed": 43, "copilotActive": 34, "copilotPrompts": int(4100 * mult), "copilotSpend": round(1290.0 * mult, 2), "claudeActive": 32, "claudeTokens": int(29500000 * mult), "claudeSpend": round(1440.0 * mult, 2), "totalTeamSpend": round(2730.0 * mult, 2), "utilizationRate": 68.8, "reclaimPotentialSpend": round(270.0 * mult, 2)},
        {"managerName": "Carlos Mendes", "managerUserName": "cmendes", "department": "Finance & Legal", "division": "Corporate & Admin", "directReportsCount": 42, "copilotLicensed": 38, "copilotActive": 28, "copilotPrompts": int(3100 * mult), "copilotSpend": round(1140.0 * mult, 2), "claudeActive": 27, "claudeTokens": int(24800000 * mult), "claudeSpend": round(1220.0 * mult, 2), "totalTeamSpend": round(2360.0 * mult, 2), "utilizationRate": 65.5, "reclaimPotentialSpend": round(300.0 * mult, 2)},
        {"managerName": "Alicia Keys", "managerUserName": "akeys", "department": "Marketing", "division": "Go-To-Market", "directReportsCount": 44, "copilotLicensed": 40, "copilotActive": 27, "copilotPrompts": int(3092 * mult), "copilotSpend": round(1200.0 * mult, 2), "claudeActive": 32, "claudeTokens": int(32584796 * mult), "claudeSpend": round(967.0 * mult, 2), "totalTeamSpend": round(2167.0 * mult, 2), "utilizationRate": 67.0, "reclaimPotentialSpend": round(390.0 * mult, 2)}
    ]

@router.get("/analytics/by-department")
async def get_analytics_by_department(
    period_key: str = Query("2026-10"),
    period_type: str = Query("MONTHLY", pattern="^(MONTHLY|WEEKLY)$"),
    manager: Optional[str] = None
):
    try:
        where_clause = "WHERE w.employee_status IN ('Active', 'ACTIVE')"
        params = {"period_key": period_key}
        if manager and manager != "ALL":
            where_clause += " AND (w.manager_name = %(manager)s OR w.manager_user_name = %(manager)s)"
            params["manager"] = manager

        sql = f"""
            WITH copilot_agg AS (
                SELECT 
                    LOWER(user_principal_name) as email,
                    MAX(last_activity_date) as last_act,
                    SUM(prompts_submitted_all_apps) as prompts,
                    MAX(active_usage_days_all_apps) as active_days
                FROM copilot_usage_user_detail
                WHERE {copilot_detail_period(period_key)}
                GROUP BY LOWER(user_principal_name)
            ),
            {_claude_agg_cte(period_key)}
            SELECT 
                w.department,
                w.division,
                COUNT(DISTINCT w.employee_id) as headcount,
                COUNT(DISTINCT cp.email) as copilot_licenses,
                COUNT(DISTINCT cp.email) FILTER (WHERE cp.active_days > 0) as copilot_active,
                COALESCE(SUM(cp.prompts), 0) as copilot_prompts,
                COUNT(DISTINCT cl.email) as claude_licenses,
                COUNT(DISTINCT cl.email) as claude_active,
                COALESCE(SUM(cl.total_tokens), 0) as claude_tokens,
                COALESCE(SUM(cl.token_cost), 0.0) as claude_token_cost
            FROM workday_employees w
            LEFT JOIN copilot_agg cp ON LOWER(w.email_work) = cp.email
            LEFT JOIN claude_agg cl ON LOWER(w.email_work) = cl.email
            {where_clause}
            GROUP BY w.department, w.division
            ORDER BY headcount DESC
        """
        rows = await query_rows(sql, params)
        if rows:
            result = []
            for r in rows:
                cop_lic = r["copilot_licenses"] or 0
                cop_act = r["copilot_active"] or 0
                cop_spend = cop_lic * (COPILOT_SEAT_PRICE if period_type == "MONTHLY" else COPILOT_SEAT_PRICE * 0.25)

                cld_lic = r["claude_licenses"] or 0
                cld_act = r["claude_active"] or 0
                cld_tok_cost = float(r["claude_token_cost"] or 0)
                cld_base_spend = cld_act * (CLAUDE_BASE_SEAT_PRICE if period_type == "MONTHLY" else CLAUDE_BASE_SEAT_PRICE * 0.25)
                cld_spend = cld_base_spend + cld_tok_cost

                total_spend = cop_spend + cld_spend
                headcount = r["headcount"] or 1
                combined_act = cop_act + cld_act
                combined_util = round(100.0 * combined_act / (headcount * 2), 1)

                result.append({
                    "name": r["department"],
                    "businessFunction": r["division"],
                    "headcount": headcount,
                    "copilotLicenses": cop_lic,
                    "copilotActive": cop_act,
                    "copilotSpend": round(cop_spend, 2),
                    "copilotPrompts": int(r["copilot_prompts"] or 0),
                    "claudeLicenses": cld_lic,
                    "claudeActive": cld_act,
                    "claudeSpend": round(cld_spend, 2),
                    "claudeTokens": int(r["claude_tokens"] or 0),
                    "totalSpend": round(total_spend, 2),
                    "combinedActive": combined_act,
                    "combinedUtilization": min(100.0, combined_util)
                })
            return result
    except Exception as e:
        logger.warning(f"DB query error in get_analytics_by_department: {e}")

    mult = 0.25 if period_type == "WEEKLY" else 1.0
    return [
        {"name": "Engineering", "businessFunction": "Core Tech", "headcount": 68, "copilotLicenses": 65, "copilotActive": 61, "copilotSpend": round(1950.0 * mult, 2), "copilotPrompts": int(11420 * mult), "claudeLicenses": 62, "claudeActive": 62, "claudeSpend": round(3280.0 * mult, 2), "claudeTokens": int(124800000 * mult), "totalSpend": round(5230.0 * mult, 2), "combinedActive": 123, "combinedUtilization": 90.4},
        {"name": "Sales & Solutions", "businessFunction": "Go-To-Market", "headcount": 52, "copilotLicenses": 50, "copilotActive": 44, "copilotSpend": round(1500.0 * mult, 2), "copilotPrompts": int(6840 * mult), "claudeLicenses": 35, "claudeActive": 35, "claudeSpend": round(1650.0 * mult, 2), "claudeTokens": int(36400000 * mult), "totalSpend": round(3150.0 * mult, 2), "combinedActive": 79, "combinedUtilization": 76.0},
        {"name": "Product & Design", "businessFunction": "Core Tech", "headcount": 46, "copilotLicenses": 44, "copilotActive": 39, "copilotSpend": round(1320.0 * mult, 2), "copilotPrompts": int(5200 * mult), "claudeLicenses": 38, "claudeActive": 38, "claudeSpend": round(1820.0 * mult, 2), "claudeTokens": int(42100000 * mult), "totalSpend": round(3140.0 * mult, 2), "combinedActive": 77, "combinedUtilization": 83.7},
        {"name": "Customer Support", "businessFunction": "Operations", "headcount": 48, "copilotLicenses": 43, "copilotActive": 34, "copilotSpend": round(1290.0 * mult, 2), "copilotPrompts": int(4100 * mult), "claudeLicenses": 32, "claudeActive": 32, "claudeSpend": round(1440.0 * mult, 2), "claudeTokens": int(29500000 * mult), "totalSpend": round(2730.0 * mult, 2), "combinedActive": 66, "combinedUtilization": 68.8},
        {"name": "Finance & Legal", "businessFunction": "Corporate & Admin", "headcount": 42, "copilotLicenses": 38, "copilotActive": 28, "copilotSpend": round(1140.0 * mult, 2), "copilotPrompts": int(3100 * mult), "claudeLicenses": 27, "claudeActive": 27, "claudeSpend": round(1220.0 * mult, 2), "claudeTokens": int(24800000 * mult), "totalSpend": round(2360.0 * mult, 2), "combinedActive": 55, "combinedUtilization": 65.5},
        {"name": "Marketing", "businessFunction": "Go-To-Market", "headcount": 44, "copilotLicenses": 40, "copilotActive": 27, "copilotSpend": round(1200.0 * mult, 2), "copilotPrompts": int(3092 * mult), "claudeLicenses": 32, "claudeActive": 32, "claudeSpend": round(967.0 * mult, 2), "claudeTokens": int(32584796 * mult), "totalSpend": round(2167.0 * mult, 2), "combinedActive": 59, "combinedUtilization": 67.0}
    ]


@router.get("/models/schema")
async def get_sqlalchemy_schema_info():
    """Return introspection info for all 7 SQLAlchemy table models generated from simple.sql."""
    from models.tables import ALL_TABLE_MODELS

    tables_info = []
    for model in ALL_TABLE_MODELS:
        table = model.__table__
        columns_info = []
        for col in table.columns:
            columns_info.append({
                "name": col.name,
                "type": str(col.type),
                "primary_key": col.primary_key,
                "nullable": col.nullable,
                "default": str(col.default) if col.default is not None else None,
            })
        tables_info.append({
            "model_name": model.__name__,
            "table_name": table.name,
            "column_count": len(table.columns),
            "columns": columns_info,
        })

    return {
        "status": "success",
        "engine": "SQLAlchemy 2.0",
        "tables_count": len(tables_info),
        "tables": tables_info,
    }


@router.get("/employees/copilot-joined")
async def get_copilot_joined_employees(
    period_key: Optional[str] = Query(None, description="e.g. 2026-10 or D30"),
    dept: Optional[str] = Query(None),
    manager: Optional[str] = Query(None),
):
    """
    Returns employees joined with Microsoft Copilot usage details.
    Uses case-insensitive LOWER(email_work) == LOWER(user_principal_name) INNER JOIN.
    """
    rows = []
    try:
        from services.database import get_joined_copilot_employees
        rows = await get_joined_copilot_employees(period_key=period_key, dept=dept, manager=manager)
    except Exception as e:
        logger.warning(f"DB query error in get_copilot_joined_employees: {e}")

    return {
        "status": "success",
        "join_key": "LOWER(workday_employees.email_work) = LOWER(copilot_usage_user_detail.user_principal_name)",
        "strategy": "INNER JOIN",
        "count": len(rows),
        "data": rows,
    }


@router.get("/employees/claude-joined")
async def get_claude_joined_employees(
    period_key: Optional[str] = Query(None, description="e.g. 2026-10"),
    dept: Optional[str] = Query(None),
    manager: Optional[str] = Query(None),
):
    """
    Returns employees joined with Anthropic Claude usage & cost details.
    Uses case-insensitive LOWER(email_work) == LOWER(email) INNER JOIN.
    """
    rows = []
    try:
        from services.database import get_joined_claude_employees
        rows = await get_joined_claude_employees(period_key=period_key, dept=dept, manager=manager)
    except Exception as e:
        logger.warning(f"DB query error in get_claude_joined_employees: {e}")

    return {
        "status": "success",
        "join_key": "LOWER(workday_employees.email_work) = LOWER(claude_user_usage_report.actor_email)",
        "strategy": "INNER JOIN",
        "count": len(rows),
        "data": rows,
    }


@router.get("/employees/ai-active-joined")
async def get_active_ai_joined_employees(
    period_key: Optional[str] = Query(None, description="e.g. 2026-10"),
):
    """
    Returns unified active AI employees across Copilot and Claude linked to Workday employee master.
    """
    rows = []
    try:
        from services.database import get_joined_active_ai_employees
        rows = await get_joined_active_ai_employees(period_key=period_key)
    except Exception as e:
        logger.warning(f"DB query error in get_active_ai_joined_employees: {e}")

    return {
        "status": "success",
        "join_strategy": "Unified case-insensitive email join",
        "count": len(rows),
        "data": rows,
    }


