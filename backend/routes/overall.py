"""
Overall tab endpoints.

Copilot and Claude figures for the Overall tab come from the shared /api/dashboard/users payload.
This router only adds the per-user ChatGPT summary the Overall tab merges into it.
If the chatgpt_* tables are not loaded yet, it answers source="unavailable" (HTTP 200) so the
frontend can show clearly-labelled sample data instead of failing.
"""
import logging
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from services.database import query_rows
from services.periods import is_weekly

logger = logging.getLogger("backend.routes.overall")
router = APIRouter(prefix="/api/overall", tags=["Overall"])

CHATGPT_SEAT_PRICE = float(os.getenv("CHATGPT_SEAT_PRICE", "30.0"))


def _usage_period(period_key: Optional[str]) -> str:
    if is_weekly(period_key):
        return "report_refresh_date = (SELECT MAX(report_refresh_date) FROM chatgpt_usage_user_detail)"
    return "(report_period = %(period_key)s OR usage_date BETWEEN %(period_start)s AND %(period_end)s)"


def _cost_period(period_key: Optional[str]) -> str:
    if is_weekly(period_key):
        return "report_refresh_date = (SELECT MAX(report_refresh_date) FROM chatgpt_cost_user_detail)"
    return "(report_period = %(period_key)s OR cost_date BETWEEN %(period_start)s AND %(period_end)s)"


def _missing_table(exc: Exception) -> bool:
    text = str(exc).lower()
    return "undefinedtable" in text or ("relation" in text and "does not exist" in text)


@router.get("/chatgpt-users")
async def get_overall_chatgpt_users(
    period_type: str = Query("MONTHLY", pattern="^(MONTHLY|WEEKLY)$"),
    period_key: str = Query("2026-10"),
):
    """One row per ChatGPT user in the selected period: tokens, requests, token cost and seat cost."""
    try:
        rows = await query_rows(
            f"""
            WITH us AS (
              SELECT LOWER(email) AS email,
                     MAX(display_name) AS display_name,
                     SUM(COALESCE(input_tokens,0) + COALESCE(output_tokens,0) + COALESCE(cached_tokens,0)) AS tokens,
                     SUM(COALESCE(request_count,0)) AS requests
              FROM chatgpt_usage_user_detail
              WHERE {_usage_period(period_key)}
              GROUP BY LOWER(email)
            ), cs AS (
              SELECT LOWER(email) AS email, SUM(COALESCE(total_cost_usd,0)) AS cost
              FROM chatgpt_cost_user_detail
              WHERE {_cost_period(period_key)}
              GROUP BY LOWER(email)
            )
            SELECT us.email, us.display_name, us.tokens, us.requests, COALESCE(cs.cost, 0) AS cost
            FROM us LEFT JOIN cs ON us.email = cs.email
            ORDER BY cost DESC, tokens DESC
            """,
            {"period_key": period_key},
        )
    except Exception as exc:  # noqa: BLE001
        if _missing_table(exc):
            logger.info("chatgpt_* tables not found; Overall tab will use sample data")
            return {"source": "unavailable", "periodKey": period_key, "rows": []}
        logger.exception("ChatGPT summary query failed")
        raise HTTPException(status_code=503, detail=f"Could not load ChatGPT users from PostgreSQL: {exc}") from exc

    seat = CHATGPT_SEAT_PRICE * (0.25 if period_type == "WEEKLY" else 1.0)
    return {
        "source": "database",
        "periodKey": period_key,
        "rows": [
            {
                "email": r["email"] or "",
                "displayName": r["display_name"] or r["email"] or "Unknown",
                "tokens": int(r["tokens"] or 0),
                "requests": int(r["requests"] or 0),
                "tokenCostUsd": round(float(r["cost"] or 0), 4),
                "seatCostUsd": round(seat, 2),
            }
            for r in rows or []
        ],
    }
