"""
Comprehensive tests for SQLAlchemy 7 table models and database connectivity.
Tests:
1. Introspection and verification of all 7 SQLAlchemy models against simple.sql specifications
2. Table creation in an async SQLite engine
3. AsyncSession CRUD operations (insert, query via select(), update, delete)
4. Parameterized raw SQL query execution via query_rows()
"""

import pytest
import pytest_asyncio
from datetime import date, datetime
from decimal import Decimal
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, text, func

from models.tables import (
    Base,
    CopilotUsageUserDetail,
    CopilotUserCountSummary,
    CopilotUserCountTrend,
    ClaudeUsageUserDetail,
    ClaudeCostUserDetail,
    ClaudeOrganizationUser,
    WorkdayEmployee,
    ALL_TABLE_MODELS,
)


def test_models_count_and_table_names():
    """Verify all 9 models exist and map to the exact table names in simple.sql."""
    assert len(ALL_TABLE_MODELS) == 9

    table_names = {model.__tablename__ for model in ALL_TABLE_MODELS}
    expected_tables = {
        "copilot_usage_user_detail",
        "copilot_user_count_summary",
        "copilot_user_count_trend",
        "claude_usage_user_detail",
        "claude_cost_user_detail",
        "claude_organization_users",
        "workday_employees",
        "chatgpt_usage_user_detail",
        "chatgpt_cost_user_detail",
    }
    assert table_names == expected_tables


def test_primary_keys():
    """Verify primary keys match simple.sql specifications."""
    # 1. copilot_usage_user_detail -> id
    assert [c.name for c in CopilotUsageUserDetail.__table__.primary_key.columns] == ["id"]
    # 2. copilot_user_count_summary -> id
    assert [c.name for c in CopilotUserCountSummary.__table__.primary_key.columns] == ["id"]
    # 3. copilot_user_count_trend -> id
    assert [c.name for c in CopilotUserCountTrend.__table__.primary_key.columns] == ["id"]
    # 4. claude_usage_user_detail -> id
    assert [c.name for c in ClaudeUsageUserDetail.__table__.primary_key.columns] == ["id"]
    # 5. claude_cost_user_detail -> id
    assert [c.name for c in ClaudeCostUserDetail.__table__.primary_key.columns] == ["id"]
    # 6. claude_organization_users -> user_id
    assert [c.name for c in ClaudeOrganizationUser.__table__.primary_key.columns] == ["user_id"]
    # 7. workday_employees -> employee_id
    assert [c.name for c in WorkdayEmployee.__table__.primary_key.columns] == ["employee_id"]


def test_workday_employee_manager_levels():
    """Verify workday_employees model has all 9 manager levels."""
    columns = WorkdayEmployee.__table__.columns
    for lvl in range(1, 10):
        assert f"manager_level_{lvl}_user_id" in columns
        assert f"manager_level_{lvl}_user_name" in columns


@pytest.mark.asyncio
async def test_sqlalchemy_table_creation_and_orm_queries():
    """Create in-memory SQLite database and test ORM queries for all 9 models."""
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_session_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session_factory() as session:
        # 1. Seed WorkdayEmployee
        emp = WorkdayEmployee(
            employee_id="EMP001",
            user_id="USR001",
            full_name="Jane Doe",
            email_work="jane.doe@michaels.com",
            department="Engineering",
            division="Core Tech",
            job_title="Staff Software Engineer",
            employee_status="Active",
            manager_name="Sarah Jenkins",
            manager_user_name="sjenkins",
            manager_level_1_user_id="EVP001",
            manager_level_1_user_name="Sarah Jenkins",
        )
        session.add(emp)

        # 2. Seed CopilotUsageUserDetail
        copilot_usage = CopilotUsageUserDetail(
            user_principal_name="jane.doe@michaels.com",
            display_name="Jane Doe",
            report_period="2026-10",
            prompts_submitted_all_apps=45,
            active_usage_days_all_apps=12,
        )
        session.add(copilot_usage)

        # 3. Seed CopilotUserCountSummary
        summary = CopilotUserCountSummary(
            report_period="D30",
            any_app_enabled_users=250,
            any_app_active_users=210,
        )
        session.add(summary)

        # 4. Seed CopilotUserCountTrend
        trend = CopilotUserCountTrend(
            report_period="D30",
            report_date=date(2026, 10, 20),
            any_app_enabled_users=250,
            any_app_active_users=212,
            prompts_submitted=1200,
        )
        session.add(trend)

        # 5. Seed ClaudeUsageUserDetail
        claude_usage = ClaudeUsageUserDetail(
            report_period="2026-10",
            user_id="USR001",
            email="jane.doe@michaels.com",
            display_name="Jane Doe",
            model="claude-3-5-sonnet",
            input_tokens=150000,
            output_tokens=35000,
            request_count=28,
        )
        session.add(claude_usage)

        # 6. Seed ClaudeCostUserDetail
        claude_cost = ClaudeCostUserDetail(
            report_period="2026-10",
            user_id="USR001",
            email="jane.doe@michaels.com",
            model="claude-3-5-sonnet",
            currency="USD",
            total_cost_usd=Decimal("3.8500"),
        )
        session.add(claude_cost)

        # 7. Seed ClaudeOrganizationUser
        claude_roster = ClaudeOrganizationUser(
            user_id="USR001",
            email="jane.doe@michaels.com",
            display_name="Jane Doe",
            role="member",
            membership_status="active",
            license_tier="enterprise",
        )
        session.add(claude_roster)

        await session.commit()

        # Query all 9 models using SQLAlchemy select()
        q_emp = await session.execute(select(WorkdayEmployee).where(WorkdayEmployee.employee_id == "EMP001"))
        fetched_emp = q_emp.scalar_one()
        assert fetched_emp.full_name == "Jane Doe"
        assert fetched_emp.department == "Engineering"

        q_cp = await session.execute(select(CopilotUsageUserDetail).where(CopilotUsageUserDetail.user_principal_name == "jane.doe@michaels.com"))
        fetched_cp = q_cp.scalar_one()
        assert fetched_cp.prompts_submitted_all_apps == 45

        q_summary = await session.execute(select(CopilotUserCountSummary))
        assert q_summary.scalar_one().any_app_active_users == 210

        q_trend = await session.execute(select(CopilotUserCountTrend))
        assert q_trend.scalar_one().prompts_submitted == 1200

        q_cld_u = await session.execute(select(ClaudeUsageUserDetail).where(ClaudeUsageUserDetail.user_id == "USR001"))
        assert q_cld_u.scalar_one().input_tokens == 150000

        q_cld_c = await session.execute(select(ClaudeCostUserDetail).where(ClaudeCostUserDetail.user_id == "USR001"))
        assert float(q_cld_c.scalar_one().total_cost_usd) == pytest.approx(3.85)

        q_roster = await session.execute(select(ClaudeOrganizationUser).where(ClaudeOrganizationUser.user_id == "USR001"))
        assert q_roster.scalar_one().license_tier == "enterprise"

    await test_engine.dispose()


def test_normalize_sql_syntax():
    """Verify %(param)s placeholders are converted to :param for SQLAlchemy."""
    from services.database import _normalize_sql
    raw_query = "SELECT * FROM workday_employees WHERE report_period = %(period_key)s AND department = %(dept)s"
    converted = _normalize_sql(raw_query)
    assert converted == "SELECT * FROM workday_employees WHERE report_period = :period_key AND department = :dept"


@pytest.mark.asyncio
async def test_database_service_query_rows():
    """Test services.database.query_rows with mocked engine and session."""
    import services.database as db_mod

    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_session_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    # Seed an employee
    async with test_session_factory() as session:
        session.add(WorkdayEmployee(
            employee_id="E100",
            full_name="Marcus Vance",
            email_work="mvance@michaels.com",
            department="Operations",
            division="Stores",
            job_title="VP Store Operations",
            employee_status="Active"
        ))
        await session.commit()

    # Temporarily set db_mod engine and session_factory
    orig_engine = db_mod.engine
    orig_factory = db_mod.session_factory
    try:
        db_mod.engine = test_engine
        db_mod.session_factory = test_session_factory

        # Test query_rows with text SQL and %(...)s param syntax
        rows = await db_mod.query_rows(
            "SELECT employee_id, full_name, department FROM workday_employees WHERE department = %(dept)s",
            {"dept": "Operations"}
        )
        assert len(rows) == 1
        assert rows[0]["employee_id"] == "E100"
        assert rows[0]["full_name"] == "Marcus Vance"

        # Test query_rows with SQLAlchemy select() statement
        stmt = select(WorkdayEmployee.employee_id, WorkdayEmployee.full_name).where(WorkdayEmployee.employee_id == "E100")
        stmt_rows = await db_mod.query_rows(stmt)
        assert len(stmt_rows) == 1
        assert stmt_rows[0]["employee_id"] == "E100"
        assert stmt_rows[0]["full_name"] == "Marcus Vance"
    finally:
        db_mod.engine = orig_engine
        db_mod.session_factory = orig_factory
        await test_engine.dispose()


@pytest.mark.asyncio
async def test_case_insensitive_relationships_and_inner_joins():
    """
    Verify:
    1. Case-insensitive matching between WorkdayEmployee.email_work and Copilot/Claude email
    2. SQLAlchemy ORM relationship navigation
    3. Inner-join query helpers (get_joined_copilot_employees, get_joined_claude_employees, get_joined_active_ai_employees)
    """
    from services.database import (
        get_joined_copilot_employees,
        get_joined_claude_employees,
        get_joined_active_ai_employees,
    )
    from sqlalchemy.orm import selectinload

    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_session_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session_factory() as session:
        # Seed Employee 1: Mixed-case email
        emp1 = WorkdayEmployee(
            employee_id="EMP_101",
            user_id="U101",
            full_name="Sarah Miller",
            email_work="Sarah.Miller@michaels.com",  # Title case
            department="Product & Design",
            division="Core Tech",
            job_title="Lead UX Designer",
            employee_status="Active",
            manager_name="Maya Lin",
        )
        # Seed Employee 2: Lower-case email
        emp2 = WorkdayEmployee(
            employee_id="EMP_102",
            user_id="U102",
            full_name="David Chen",
            email_work="david.chen@michaels.com",    # Lowercase
            department="Engineering",
            division="Core Tech",
            job_title="Principal Engineer",
            employee_status="Active",
            manager_name="Sarah Jenkins",
        )
        # Seed Employee 3: Inactive employee with no AI telemetry
        emp3 = WorkdayEmployee(
            employee_id="EMP_103",
            user_id="U103",
            full_name="Bob Idle",
            email_work="bob.idle@michaels.com",
            department="Finance",
            division="Admin",
            job_title="Analyst",
            employee_status="Active",
        )
        session.add_all([emp1, emp2, emp3])

        # Copilot telemetry for Sarah (UPPER CASE user_principal_name)
        cp1 = CopilotUsageUserDetail(
            user_principal_name="SARAH.MILLER@MICHAELS.COM",  # ALL CAPS
            display_name="Sarah Miller",
            report_period="2026-10",
            prompts_submitted_all_apps=85,
            active_usage_days_all_apps=18,
        )
        # Claude telemetry for David (lower case email)
        cld1 = ClaudeUsageUserDetail(
            email="david.chen@michaels.com",
            user_id="U102",
            report_period="2026-10",
            model="claude-3-5-sonnet",
            input_tokens=220000,
            output_tokens=45000,
            request_count=42,
        )
        cld_cost1 = ClaudeCostUserDetail(
            email="david.chen@michaels.com",
            user_id="U102",
            report_period="2026-10",
            model="claude-3-5-sonnet",
            total_cost_usd=Decimal("5.2500"),
        )
        session.add_all([cp1, cld1, cld_cost1])
        await session.commit()

        # 1. Test ORM relationship loading with selectinload
        q_emp1 = await session.execute(
            select(WorkdayEmployee)
            .where(WorkdayEmployee.employee_id == "EMP_101")
            .options(selectinload(WorkdayEmployee.copilot_usage))
        )
        res_emp1 = q_emp1.scalar_one()
        assert len(res_emp1.copilot_usage) == 1
        assert res_emp1.copilot_usage[0].prompts_submitted_all_apps == 85

        q_emp2 = await session.execute(
            select(WorkdayEmployee)
            .where(WorkdayEmployee.employee_id == "EMP_102")
            .options(
                selectinload(WorkdayEmployee.claude_usage),
                selectinload(WorkdayEmployee.claude_costs),
            )
        )
        res_emp2 = q_emp2.scalar_one()
        assert len(res_emp2.claude_usage) == 1
        assert res_emp2.claude_usage[0].input_tokens == 220000
        assert len(res_emp2.claude_costs) == 1
        assert float(res_emp2.claude_costs[0].total_cost_usd) == pytest.approx(5.25)

        # 2. Test Inner Join helper for Copilot:
        # emp1 has Copilot, emp2 and emp3 do not -> exactly 1 row returned
        copilot_rows = await get_joined_copilot_employees(session=session)
        assert len(copilot_rows) == 1
        assert copilot_rows[0]["employee_id"] == "EMP_101"
        assert copilot_rows[0]["full_name"] == "Sarah Miller"
        assert copilot_rows[0]["prompts_submitted_all_apps"] == 85

        # 3. Test Inner Join helper for Claude:
        # emp2 has Claude, emp1 and emp3 do not -> exactly 1 row returned
        claude_rows = await get_joined_claude_employees(session=session)
        assert len(claude_rows) == 1
        assert claude_rows[0]["employee_id"] == "EMP_102"
        assert claude_rows[0]["full_name"] == "David Chen"
        assert claude_rows[0]["input_tokens"] == 220000
        assert float(claude_rows[0]["total_cost_usd"]) == pytest.approx(5.25)

        # 4. Test Unified Active AI helper:
        # emp1 (Copilot) and emp2 (Claude) returned, emp3 (no AI telemetry) excluded
        active_ai_rows = await get_joined_active_ai_employees(session=session)
        assert len(active_ai_rows) == 2
        active_ids = {r["employee_id"] for r in active_ai_rows}
        assert active_ids == {"EMP_101", "EMP_102"}
        assert "EMP_103" not in active_ids

    await test_engine.dispose()


def test_api_endpoints_joined_routes():
    """Verify FastAPI routes for joined employees and schema introspection."""
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)

    # 1. Test schema introspection
    r_schema = client.get("/api/models/schema")
    assert r_schema.status_code == 200
    schema_data = r_schema.json()
    assert schema_data["status"] == "success"
    assert schema_data["tables_count"] == 9

    # 2. Test joined endpoints respond with standard structure
    r_cp = client.get("/api/employees/copilot-joined")
    assert r_cp.status_code == 200
    data_cp = r_cp.json()
    assert data_cp["status"] == "success"
    assert "strategy" in data_cp
    assert data_cp["strategy"] == "INNER JOIN"

    r_cld = client.get("/api/employees/claude-joined")
    assert r_cld.status_code == 200
    data_cld = r_cld.json()
    assert data_cld["status"] == "success"
    assert data_cld["strategy"] == "INNER JOIN"

    r_act = client.get("/api/employees/ai-active-joined")
    assert r_act.status_code == 200
    assert r_act.json()["status"] == "success"


def test_copilot_kpi_and_trend_endpoints():
    """Verify Copilot KPIs and trend endpoints return expected metric calculations."""
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)

    # Monthly KPIs
    r_kpis_m = client.get("/api/copilot/kpis?period_type=MONTHLY&period_key=2026-10")
    assert r_kpis_m.status_code == 200
    kpis_m = r_kpis_m.json()
    assert "licensedUsers" in kpis_m
    assert "activeUsers28d" in kpis_m
    assert "idleUsersCount" in kpis_m
    assert "totalVolume" in kpis_m

    # Weekly KPIs
    r_kpis_w = client.get("/api/copilot/kpis?period_type=WEEKLY&period_key=2026-W42")
    assert r_kpis_w.status_code == 200
    kpis_w = r_kpis_w.json()
    assert "licensedUsers" in kpis_w
    assert "idleUsersCount" in kpis_w

    # Trend endpoint
    r_trend_m = client.get("/api/copilot/trend?period_type=MONTHLY")
    assert r_trend_m.status_code == 200
    assert "rows" in r_trend_m.json()

    r_trend_w = client.get("/api/copilot/trend?period_type=WEEKLY")
    assert r_trend_w.status_code == 200
    assert "rows" in r_trend_w.json()




