"""
Anthropic Claude platform KPIs, models, and token analytics endpoints.

All figures come from the raw Anthropic Analytics report tables:
    claude_user_usage_report
    claude_user_cost_report

`starting_at` / `ending_at` are the report bucket interval. Monthly views use
starting_at >= period start and ending_at <= period end + 1 day. Weekly views use
the last 7 days ending at the newest ending_at in the report table.

Cost amounts are stored in cents (fractional minor units); this module converts
them to USD.
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from services.database import query_rows, CLAUDE_BASE_SEAT_PRICE
from services.periods import claude_raw_cost_period, claude_raw_usage_period

logger = logging.getLogger("backend.routes.claude")
router = APIRouter(prefix="/api/claude", tags=["Claude"])

USAGE_TABLE = "claude_user_usage_report"
COST_TABLE = "claude_user_cost_report"

# Token expression over the raw usage report (alias u).
USAGE_TOKENS = (
    "COALESCE(u.uncached_input_tokens, 0) + COALESCE(u.output_tokens, 0) "
    "+ COALESCE(u.cache_read_input_tokens, 0) "
    "+ COALESCE(u.ephemeral_5m_input_tokens, 0) + COALESCE(u.ephemeral_1h_input_tokens, 0)"
)

USAGE_USER_KEY = "COALESCE(NULLIF(u.actor_user_id, ''), LOWER(NULLIF(u.actor_email, '')), 'unknown')"
COST_USER_KEY = "COALESCE(NULLIF(c.actor_user_id, ''), LOWER(NULLIF(c.actor_email, '')), 'unknown')"


def _workday_filter(dept: Optional[str], manager: Optional[str]) -> tuple[str, dict]:
    """Optional Workday filters; only join Workday when a filter is present."""
    clauses = []
    params = {}
    if dept and dept != "ALL":
        clauses.append("w.department = %(dept)s")
        params["dept"] = dept
    if manager and manager != "ALL":
        clauses.append("(w.manager_name = %(manager)s OR w.manager_user_name = %(manager)s)")
        params["manager"] = manager
    return " AND ".join(clauses), params


@router.get("/kpis")
async def get_claude_kpis(
    period_type: str = Query("MONTHLY", pattern="^(MONTHLY|WEEKLY)$"),
    period_key: str = Query("2026-10"),
    dept: Optional[str] = None,
    manager: Optional[str] = None,
):
    usage_period = claude_raw_usage_period(period_key, "u")
    cost_period = claude_raw_cost_period(period_key, "c")
    extra_filter, extra_params = _workday_filter(dept, manager)
    params = {"period_key": period_key, **extra_params}

    usage_join = ""
    cost_join = ""
    usage_where = usage_period
    cost_where = cost_period
    if extra_filter:
        usage_join = (
            "LEFT JOIN workday_employees w "
            "ON u.actor_user_id = w.user_id OR LOWER(u.actor_email) = LOWER(w.email_work)"
        )
        cost_join = (
            "LEFT JOIN workday_employees w "
            "ON c.actor_user_id = w.user_id OR LOWER(c.actor_email) = LOWER(w.email_work)"
        )
        usage_where = f"{usage_period} AND {extra_filter}"
        cost_where = f"{cost_period} AND {extra_filter}"

    # Last 7 days of the selected window (by report interval end).
    week_clause = (
        "u.ending_at > ("
        f"SELECT MAX(u2.ending_at) FROM {USAGE_TABLE} u2 "
        f"WHERE {claude_raw_usage_period(period_key, 'u2')}"
        ") - INTERVAL '7 days'"
    )

    try:
        usage_rows = await query_rows(
            f"""
            SELECT
                COUNT(DISTINCT {USAGE_USER_KEY}) AS active_users,
                COUNT(DISTINCT {USAGE_USER_KEY}) FILTER (WHERE {week_clause}) AS weekly_active_users,
                COALESCE(SUM(u.uncached_input_tokens), 0) AS input_tokens,
                COALESCE(SUM(u.output_tokens), 0) AS output_tokens,
                COALESCE(SUM(u.cache_read_input_tokens), 0) AS cache_read,
                COALESCE(SUM(COALESCE(u.ephemeral_5m_input_tokens, 0)
                             + COALESCE(u.ephemeral_1h_input_tokens, 0)), 0) AS cache_create
            FROM {USAGE_TABLE} u
            {usage_join}
            WHERE {usage_where}
            """,
            params,
        )
        cost_rows = await query_rows(
            f"""
            SELECT COALESCE(SUM(c.amount), 0) / 100.0 AS token_cost
            FROM {COST_TABLE} c
            {cost_join}
            WHERE {cost_where}
            """,
            params,
        )
    except Exception as exc:
        logger.exception("Claude KPI query failed")
        raise HTTPException(
            status_code=503,
            detail=f"Could not load Claude KPIs from PostgreSQL: {exc}",
        ) from exc

    u = usage_rows[0] if usage_rows else {}
    c = cost_rows[0] if cost_rows else {}

    act = int(u.get("active_users") or 0)
    wau = int(u.get("weekly_active_users") or 0)
    in_tok = int(u.get("input_tokens") or 0)
    out_tok = int(u.get("output_tokens") or 0)
    cr_tok = int(u.get("cache_read") or 0)
    cc_tok = int(u.get("cache_create") or 0)
    total_tokens = in_tok + out_tok + cr_tok + cc_tok
    token_cost = float(c.get("token_cost") or 0)

    seat_cost = act * (
        CLAUDE_BASE_SEAT_PRICE if period_type == "MONTHLY" else CLAUDE_BASE_SEAT_PRICE * 0.25
    )
    total_spend = seat_cost + token_cost

    return {
        "licensedUsers": act,
        "activeUsers28d": act,
        "weeklyActiveUsers": wau,
        "utilizationRate": 100.0 if act else 0.0,
        "idleUsersCount": 0,
        "lapsedUsersCount": 0,
        "neverUsedCount": 0,
        "totalMonthlySpend": round(total_spend, 2),
        "avgSpendPerActiveUser": round(total_spend / act, 2) if act else 0.0,
        "totalVolume": total_tokens,
        "avgVolumePerActive": round(total_tokens / act) if act else 0,
        "purchasedSeats": act,
        "rosterRestricted": True,
        "telemetrySource": "Anthropic Analytics Telemetry (raw user reports)",
    }


@router.get("/models")
async def get_claude_models(period_key: str = Query("2026-10")):
    usage_period = claude_raw_usage_period(period_key, "u")
    cost_period = claude_raw_cost_period(period_key, "c")
    try:
        rows = await query_rows(
            f"""
            WITH usage AS (
              SELECT COALESCE(NULLIF(u.model, ''), 'Unknown model') AS model,
                     SUM({USAGE_TOKENS})::bigint AS tokens
              FROM {USAGE_TABLE} u
              WHERE {usage_period}
              GROUP BY 1
            ), costs AS (
              SELECT COALESCE(NULLIF(c.model, ''), 'Unknown model') AS model,
                     SUM(COALESCE(c.amount, 0)) / 100.0 AS cost
              FROM {COST_TABLE} c
              WHERE {cost_period}
              GROUP BY 1
            )
            SELECT COALESCE(usage.model, costs.model, 'Unknown model') AS id,
                   COALESCE(usage.tokens, 0)::bigint AS tokens,
                   COALESCE(costs.cost, 0) AS cost
            FROM usage FULL OUTER JOIN costs ON usage.model = costs.model
            ORDER BY cost DESC, tokens DESC
            """,
            {"period_key": period_key},
        )
        return [
            {
                "id": r["id"],
                "name": r["id"],
                "tokens": int(r["tokens"] or 0),
                "cost": round(float(r["cost"] or 0), 4),
            }
            for r in (rows or [])
        ]
    except Exception as exc:
        logger.exception("Claude model report query failed")
        raise HTTPException(
            status_code=503,
            detail=f"Could not load Claude model report: {exc}",
        ) from exc


@router.get("/analytics")
async def get_claude_report_analytics(period_key: str = Query("2026-10")):
    """Analytics built directly from the raw Anthropic usage and cost reports.

    Usage and cost are aggregated independently before joining in Python, so
    multiple cost rows for the same user/model/day cannot multiply token counts.
    No synthetic metrics or fallback data are returned.
    """
    usage_period = claude_raw_usage_period(period_key, "u")
    cost_period = claude_raw_cost_period(period_key, "c")
    params = {"period_key": period_key}

    try:
        usage_rows = await query_rows(
            f"""
            SELECT
                {USAGE_USER_KEY} AS user_key,
                u.actor_user_id AS user_id,
                LOWER(u.actor_email) AS email,
                MAX(u.actor_name) AS display_name,
                COALESCE(NULLIF(u.model, ''), 'Unknown model') AS model,
                SUM(COALESCE(u.uncached_input_tokens, 0))::bigint AS input_tokens,
                SUM(COALESCE(u.output_tokens, 0))::bigint AS output_tokens,
                SUM(COALESCE(u.cache_read_input_tokens, 0))::bigint AS cache_read_tokens,
                SUM(COALESCE(u.ephemeral_5m_input_tokens, 0)
                    + COALESCE(u.ephemeral_1h_input_tokens, 0))::bigint AS cache_creation_tokens,
                SUM(COALESCE(u.requests, 0))::bigint AS requests,
                MAX((u.ending_at AT TIME ZONE 'UTC')::date) AS last_activity,
                MIN((u.starting_at AT TIME ZONE 'UTC')::date) AS first_activity
            FROM {USAGE_TABLE} u
            WHERE {usage_period}
            GROUP BY {USAGE_USER_KEY}, u.actor_user_id, LOWER(u.actor_email),
                     COALESCE(NULLIF(u.model, ''), 'Unknown model')
            ORDER BY user_key, model
            """,
            params,
        )

        cost_rows = await query_rows(
            f"""
            SELECT
                {COST_USER_KEY} AS user_key,
                c.actor_user_id AS user_id,
                LOWER(c.actor_email) AS email,
                COALESCE(NULLIF(c.model, ''), 'Unknown model') AS model,
                MAX(c.currency) AS currency,
                SUM(COALESCE(c.amount, 0)) / 100.0 AS total_cost
            FROM {COST_TABLE} c
            WHERE {cost_period}
            GROUP BY {COST_USER_KEY}, c.actor_user_id, LOWER(c.actor_email),
                     COALESCE(NULLIF(c.model, ''), 'Unknown model')
            ORDER BY user_key, model
            """,
            params,
        )

        usage_by_key = {}
        users = {}
        models = {}
        daily = {}

        usage_trend_rows = await query_rows(
            f"""
            SELECT (u.starting_at AT TIME ZONE 'UTC')::date AS date,
                   SUM({USAGE_TOKENS})::bigint AS tokens,
                   SUM(COALESCE(u.requests, 0))::bigint AS requests
            FROM {USAGE_TABLE} u
            WHERE {usage_period}
            GROUP BY (u.starting_at AT TIME ZONE 'UTC')::date
            ORDER BY 1
            """,
            params,
        )
        for row in usage_trend_rows or []:
            d = row.get("date")
            if d:
                key = d.isoformat() if hasattr(d, "isoformat") else str(d)
                daily[key] = {
                    "date": key,
                    "label": key,
                    "tokens": int(row.get("tokens") or 0),
                    "requests": int(row.get("requests") or 0),
                    "costUsd": 0.0,
                }

        for row in usage_rows or []:
            user_key = str(row.get("user_key") or "unknown")
            model = str(row.get("model") or "Unknown model")
            tokens = sum(
                int(row.get(k) or 0)
                for k in ("input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens")
            )
            entry = {
                "userId": row.get("user_id"),
                "email": row.get("email"),
                "displayName": row.get("display_name") or row.get("email") or row.get("user_id") or "Unknown user",
                "model": model,
                "inputTokens": int(row.get("input_tokens") or 0),
                "outputTokens": int(row.get("output_tokens") or 0),
                "cacheReadTokens": int(row.get("cache_read_tokens") or 0),
                "cacheCreationTokens": int(row.get("cache_creation_tokens") or 0),
                "totalTokens": tokens,
                "requests": int(row.get("requests") or 0),
                "lastActivity": row.get("last_activity").isoformat() if row.get("last_activity") else None,
                "costUsd": 0.0,
            }
            usage_by_key[(user_key, model)] = entry
            user = users.setdefault(
                user_key,
                {
                    "userId": row.get("user_id"),
                    "email": row.get("email"),
                    "displayName": entry["displayName"],
                    "inputTokens": 0,
                    "outputTokens": 0,
                    "cacheReadTokens": 0,
                    "cacheCreationTokens": 0,
                    "totalTokens": 0,
                    "requests": 0,
                    "costUsd": 0.0,
                    "models": set(),
                    "lastActivity": None,
                },
            )
            for field in ("inputTokens", "outputTokens", "cacheReadTokens", "cacheCreationTokens", "totalTokens", "requests"):
                user[field] += entry[field]
            user["models"].add(model)
            if entry["lastActivity"] and (
                not user["lastActivity"] or entry["lastActivity"] > user["lastActivity"]
            ):
                user["lastActivity"] = entry["lastActivity"]

            model_item = models.setdefault(
                model,
                {
                    "model": model,
                    "inputTokens": 0,
                    "outputTokens": 0,
                    "cacheReadTokens": 0,
                    "cacheCreationTokens": 0,
                    "totalTokens": 0,
                    "requests": 0,
                    "costUsd": 0.0,
                },
            )
            for field in ("inputTokens", "outputTokens", "cacheReadTokens", "cacheCreationTokens", "totalTokens", "requests"):
                model_item[field] += entry[field]

        for row in cost_rows or []:
            user_key = str(row.get("user_key") or "unknown")
            model = str(row.get("model") or "Unknown model")
            cost = float(row.get("total_cost") or 0)
            entry = usage_by_key.get((user_key, model))
            if entry:
                entry["costUsd"] += cost
            user = users.get(user_key)
            if user:
                user["costUsd"] += cost
            model_item = models.setdefault(
                model,
                {
                    "model": model,
                    "inputTokens": 0,
                    "outputTokens": 0,
                    "cacheReadTokens": 0,
                    "cacheCreationTokens": 0,
                    "totalTokens": 0,
                    "requests": 0,
                    "costUsd": 0.0,
                },
            )
            model_item["costUsd"] += cost

        # Cost trend follows the cost report's own starting_at date.
        cost_trend = await query_rows(
            f"""
            SELECT (c.starting_at AT TIME ZONE 'UTC')::date AS date,
                   SUM(COALESCE(c.amount, 0)) / 100.0 AS cost_usd
            FROM {COST_TABLE} c
            WHERE {cost_period}
            GROUP BY (c.starting_at AT TIME ZONE 'UTC')::date
            ORDER BY 1
            """,
            params,
        )
        for row in cost_trend or []:
            d = row.get("date")
            if d:
                key = d.isoformat() if hasattr(d, "isoformat") else str(d)
                point = daily.setdefault(
                    key,
                    {"date": key, "label": key, "tokens": 0, "requests": 0, "costUsd": 0.0},
                )
                point["costUsd"] += float(row.get("cost_usd") or 0)

        department_rows = await query_rows(
            f"""
            SELECT COALESCE(NULLIF(TRIM(w.department), ''), 'Unassigned') AS department,
                   SUM(COALESCE(c.amount, 0)) / 100.0 AS cost_usd
            FROM {COST_TABLE} c
            LEFT JOIN workday_employees w
              ON c.actor_user_id = w.user_id
              OR LOWER(NULLIF(c.actor_email, '')) = LOWER(NULLIF(w.email_work, ''))
            WHERE {cost_period}
            GROUP BY COALESCE(NULLIF(TRIM(w.department), ''), 'Unassigned')
            ORDER BY cost_usd DESC
            """,
            params,
        )
        departments = [
            {
                "department": row.get("department") or "Unassigned",
                "costUsd": round(float(row.get("cost_usd") or 0), 4),
            }
            for row in (department_rows or [])
        ]

        # Same cost join, grouped by EVP (Workday manager_level_3_user_id).
        evp_rows = await query_rows(
            f"""
            SELECT COALESCE(NULLIF(TRIM(w.manager_level_3_user_id), ''), 'Unassigned') AS evp_id,
                   MAX(NULLIF(TRIM(w.manager_level_3_user_name), '')) AS evp_name,
                   SUM(COALESCE(c.amount, 0)) / 100.0 AS cost_usd
            FROM {COST_TABLE} c
            LEFT JOIN workday_employees w
              ON c.actor_user_id = w.user_id
              OR LOWER(NULLIF(c.actor_email, '')) = LOWER(NULLIF(w.email_work, ''))
            WHERE {cost_period}
            GROUP BY COALESCE(NULLIF(TRIM(w.manager_level_3_user_id), ''), 'Unassigned')
            ORDER BY cost_usd DESC
            """,
            params,
        )
        evps = [
            {
                "evpId": row.get("evp_id") or "Unassigned",
                "evpName": row.get("evp_name") or row.get("evp_id") or "Unassigned",
                "costUsd": round(float(row.get("cost_usd") or 0), 4),
            }
            for row in (evp_rows or [])
        ]

        # Attach Workday department/title to each reporting user.
        meta_by_email = {}
        try:
            meta_rows = await query_rows(
                """
                SELECT DISTINCT ON (LOWER(TRIM(w.email_work)))
                       LOWER(TRIM(w.email_work)) AS match_key,
                       NULLIF(TRIM(w.department), '') AS department,
                       NULLIF(TRIM(w.job_title), '') AS title
                FROM workday_employees w
                WHERE NULLIF(TRIM(w.email_work), '') IS NOT NULL
                ORDER BY LOWER(TRIM(w.email_work))
                """
            )
            meta_by_email = {
                (row.get("match_key") or "").lower(): (row.get("department"), row.get("title"))
                for row in (meta_rows or [])
            }
        except Exception:
            logger.warning("Workday enrichment unavailable for Claude analytics", exc_info=True)

        clean_users = []
        for user in users.values():
            user["models"] = sorted(user["models"])
            user["costUsd"] = round(user["costUsd"], 4)
            department, title = meta_by_email.get((user.get("email") or "").lower(), (None, None))
            user["department"] = department
            user["title"] = title
            clean_users.append(user)

        clean_users.sort(key=lambda x: x["costUsd"], reverse=True)
        clean_models = sorted(models.values(), key=lambda x: x["costUsd"], reverse=True)
        for model in clean_models:
            model["costUsd"] = round(model["costUsd"], 4)
        points = sorted(daily.values(), key=lambda x: x["date"])

        total_tokens = sum(u["totalTokens"] for u in clean_users)
        total_requests = sum(u["requests"] for u in clean_users)
        total_cost = sum(float(m["costUsd"]) for m in clean_models)
        total_cache_read = sum(u["cacheReadTokens"] for u in clean_users)
        total_cache_creation = sum(u["cacheCreationTokens"] for u in clean_users)

        return {
            "periodKey": period_key,
            "source": {"usage": USAGE_TABLE, "cost": COST_TABLE},
            "kpis": {
                "activeUsers": len(clean_users),
                "totalTokens": total_tokens,
                "inputTokens": sum(u["inputTokens"] for u in clean_users),
                "outputTokens": sum(u["outputTokens"] for u in clean_users),
                "cacheReadTokens": total_cache_read,
                "cacheCreationTokens": total_cache_creation,
                "requests": total_requests,
                "reportedCostUsd": round(total_cost, 4),
                "averageCostPerReportingUserUsd": round(total_cost / len(clean_users), 4) if clean_users else 0.0,
                "modelCount": len(clean_models),
            },
            "models": clean_models,
            "users": clean_users,
            "trend": points,
            "departments": departments,
            "evps": evps,
        }
    except Exception as exc:
        logger.exception("Claude report analytics query failed")
        raise HTTPException(
            status_code=503,
            detail=f"Could not build Claude analytics from usage/cost reports: {exc}",
        ) from exc
