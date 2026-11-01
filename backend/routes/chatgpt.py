"""
OpenAI ChatGPT platform KPIs, models, and token analytics endpoints
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from services.periods import chatgpt_cost_join_extra, chatgpt_usage_period, chatgpt_cost_period
from services.database import query_rows, CHATGPT_SEAT_PRICE

logger = logging.getLogger("backend.routes.chatgpt")
router = APIRouter(prefix="/api/chatgpt", tags=["ChatGPT"])

@router.get("/kpis")
async def get_chatgpt_kpis(
    period_type: str = Query("MONTHLY", pattern="^(MONTHLY|WEEKLY)$"),
    period_key: str = Query("2026-10"),
    dept: Optional[str] = None,
    manager: Optional[str] = None
):
    try:
        where_conditions = [chatgpt_usage_period(period_key, "u")]
        params = {"period_key": period_key}

        if dept and dept != "ALL":
            where_conditions.append("w.department = %(dept)s")
            params["dept"] = dept
        if manager and manager != "ALL":
            where_conditions.append("(w.manager_name = %(manager)s OR w.manager_user_name = %(manager)s)")
            params["manager"] = manager

        where_str = " AND ".join(where_conditions)

        sql = f"""
            SELECT 
                COUNT(DISTINCT u.user_id) AS active_users,
                COALESCE(SUM(u.input_tokens), 0) AS input_tokens,
                COALESCE(SUM(u.output_tokens), 0) AS output_tokens,
                COALESCE(SUM(u.cached_tokens), 0) AS cached_tokens,
                COALESCE(SUM(c.total_cost_usd), 0.00) AS token_cost,
                COUNT(DISTINCT CASE WHEN u.usage_date >= (
                    SELECT MAX(usage_date) FROM chatgpt_usage_user_detail WHERE {chatgpt_usage_period(period_key)}
                ) - INTERVAL '6 days' THEN u.user_id END) AS weekly_active_users
            FROM chatgpt_usage_user_detail u
            LEFT JOIN workday_employees w ON u.user_id = w.user_id OR LOWER(u.email) = LOWER(w.email_work)
            LEFT JOIN chatgpt_cost_user_detail c 
                ON u.user_id = c.user_id AND u.report_period = c.report_period AND u.model = c.model AND c.cost_date = u.usage_date{chatgpt_cost_join_extra(period_key)}
            WHERE {where_str}
        """
        rows = await query_rows(sql, params)
        if rows and rows[0]["active_users"] > 0:
            r = rows[0]
            act = r["active_users"]
            in_tok = r["input_tokens"]
            out_tok = r["output_tokens"]
            cached_tok = r["cached_tokens"]
            tot_tok = in_tok + out_tok + cached_tok
            tok_cost = float(r["token_cost"])
            base_seats_cost = act * (CHATGPT_SEAT_PRICE if period_type == "MONTHLY" else CHATGPT_SEAT_PRICE * 0.25)
            tot_spend = base_seats_cost + tok_cost
            wau = int(r["weekly_active_users"] or 0)

            return {
                "licensedUsers": act,
                "activeUsers28d": act,
                "weeklyActiveUsers": wau,
                "utilizationRate": 100.0,
                "idleUsersCount": 0,
                "lapsedUsersCount": 0,
                "neverUsedCount": 0,
                "totalMonthlySpend": round(tot_spend, 2),
                "avgSpendPerActiveUser": round(tot_spend / act, 2) if act else 0.0,
                "totalVolume": tot_tok,
                "avgVolumePerActive": round(tot_tok / act) if act else 0,
                "purchasedSeats": act,
                "rosterRestricted": True,
                "telemetrySource": "OpenAI Usage Telemetry (Active Consumers)"
            }
    except Exception as e:
        logger.exception("ChatGPT DB query failed")
        raise HTTPException(status_code=503, detail=f"Could not load ChatGPT KPIs from PostgreSQL: {e}") from e

    # An empty result is real empty data
    r = rows[0] if rows else {}
    act = int(r.get("active_users") or 0)
    in_tok = int(r.get("input_tokens") or 0)
    out_tok = int(r.get("output_tokens") or 0)
    cached_tok = int(r.get("cached_tokens") or 0)
    tok_cost = float(r.get("token_cost") or 0)
    total_tokens = in_tok + out_tok + cached_tok
    seat_cost = act * (CHATGPT_SEAT_PRICE if period_type == "MONTHLY" else CHATGPT_SEAT_PRICE * 0.25)
    total_spend = seat_cost + tok_cost
    return {
        "licensedUsers": act,
        "activeUsers28d": act,
        "weeklyActiveUsers": 0,
        "utilizationRate": 0.0 if act == 0 else 100.0,
        "idleUsersCount": 0,
        "lapsedUsersCount": 0,
        "neverUsedCount": 0,
        "totalMonthlySpend": round(total_spend, 2),
        "avgSpendPerActiveUser": round(total_spend / act, 2) if act else 0.0,
        "totalVolume": total_tokens,
        "avgVolumePerActive": round(total_tokens / act) if act else 0,
        "purchasedSeats": act,
        "rosterRestricted": True,
        "telemetrySource": "OpenAI Usage Telemetry (Active Consumers)"
    }

@router.get("/models")
async def get_chatgpt_models(period_key: str = Query("2026-10")):
    try:
        rows = await query_rows("""
            WITH usage AS (
              SELECT model,
                SUM(COALESCE(input_tokens,0) + COALESCE(output_tokens,0)
                    + COALESCE(cached_tokens,0)) AS tokens
              FROM chatgpt_usage_user_detail WHERE """ + chatgpt_usage_period(period_key) + """ GROUP BY model
            ), costs AS (
              SELECT model, SUM(COALESCE(total_cost_usd,0)) AS cost
              FROM chatgpt_cost_user_detail WHERE """ + chatgpt_cost_period(period_key) + """ GROUP BY model
            )
            SELECT COALESCE(usage.model, costs.model, 'Unknown model') AS id,
                   COALESCE(usage.tokens,0)::bigint AS tokens,
                   COALESCE(costs.cost,0) AS cost
            FROM usage FULL OUTER JOIN costs ON usage.model = costs.model
            ORDER BY cost DESC, tokens DESC
        """, {"period_key": period_key})
        return [{"id": r["id"], "name": r["id"], "tokens": int(r["tokens"] or 0), "cost": round(float(r["cost"] or 0), 4)} for r in (rows or [])]
    except Exception as exc:
        logger.exception("ChatGPT model report query failed")
        raise HTTPException(status_code=503, detail=f"Could not load ChatGPT model report: {exc}") from exc


@router.get("/analytics")
async def get_chatgpt_report_analytics(
    period_key: str = Query("2026-10"),
):
    """Return cloud dashboard analytics derived only from persisted OpenAI ChatGPT usage/cost reports."""
    try:
        usage_rows = await query_rows("""
            SELECT
                COALESCE(NULLIF(user_id, ''), LOWER(NULLIF(email, '')), 'unknown') AS user_key,
                user_id, LOWER(email) AS email, MAX(display_name) AS display_name,
                COALESCE(NULLIF(model, ''), 'Unknown model') AS model,
                SUM(COALESCE(input_tokens, 0))::bigint AS input_tokens,
                SUM(COALESCE(output_tokens, 0))::bigint AS output_tokens,
                SUM(COALESCE(cached_tokens, 0))::bigint AS cached_tokens,
                SUM(COALESCE(request_count, 0))::bigint AS requests,
                MAX(usage_date) AS last_activity,
                MIN(usage_date) AS first_activity
            FROM chatgpt_usage_user_detail
            WHERE """ + chatgpt_usage_period(period_key) + """
            GROUP BY COALESCE(NULLIF(user_id, ''), LOWER(NULLIF(email, '')), 'unknown'),
                     user_id, LOWER(email), COALESCE(NULLIF(model, ''), 'Unknown model')
            ORDER BY user_key, model
        """, {"period_key": period_key})

        cost_rows = await query_rows("""
            SELECT
                COALESCE(NULLIF(user_id, ''), LOWER(NULLIF(email, '')), 'unknown') AS user_key,
                user_id, LOWER(email) AS email,
                COALESCE(NULLIF(model, ''), 'Unknown model') AS model,
                MAX(currency) AS currency,
                SUM(COALESCE(input_cost_usd, 0)) AS input_cost,
                SUM(COALESCE(output_cost_usd, 0)) AS output_cost,
                SUM(COALESCE(cached_cost_usd, 0)) AS cached_cost,
                SUM(COALESCE(total_cost_usd, 0)) AS total_cost
            FROM chatgpt_cost_user_detail
            WHERE """ + chatgpt_cost_period(period_key) + """
            GROUP BY COALESCE(NULLIF(user_id, ''), LOWER(NULLIF(email, '')), 'unknown'),
                     user_id, LOWER(email), COALESCE(NULLIF(model, ''), 'Unknown model')
            ORDER BY user_key, model
        """, {"period_key": period_key})

        usage_by_key = {}
        users = {}
        models = {}
        daily = {}
        usage_trend_rows = await query_rows("""
            SELECT usage_date::date AS date,
                   SUM(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)
                       + COALESCE(cached_tokens, 0))::bigint AS tokens,
                   SUM(COALESCE(request_count, 0))::bigint AS requests
            FROM chatgpt_usage_user_detail
            WHERE """ + chatgpt_usage_period(period_key) + """
            GROUP BY usage_date::date ORDER BY usage_date::date
        """, {"period_key": period_key})
        for row in usage_trend_rows or []:
            d = row.get("date")
            if d:
                key = d.isoformat() if hasattr(d, "isoformat") else str(d)
                daily[key] = {"date": key, "label": key, "tokens": int(row.get("tokens") or 0), "requests": int(row.get("requests") or 0), "costUsd": 0.0}

        for row in usage_rows or []:
            user_key = str(row.get("user_key") or "unknown")
            model = str(row.get("model") or "Unknown model")
            tokens = sum(int(row.get(k) or 0) for k in ("input_tokens", "output_tokens", "cached_tokens"))
            entry = {
                "userId": row.get("user_id"), "email": row.get("email"),
                "displayName": row.get("display_name") or row.get("email") or row.get("user_id") or "Unknown user",
                "model": model,
                "inputTokens": int(row.get("input_tokens") or 0),
                "outputTokens": int(row.get("output_tokens") or 0),
                "cachedTokens": int(row.get("cached_tokens") or 0),
                "totalTokens": tokens,
                "requests": int(row.get("requests") or 0),
                "lastActivity": row.get("last_activity").isoformat() if row.get("last_activity") else None,
                "costUsd": 0.0,
            }
            usage_by_key[(user_key, model)] = entry
            user = users.setdefault(user_key, {
                "userId": row.get("user_id"), "email": row.get("email"),
                "displayName": entry["displayName"], "inputTokens": 0, "outputTokens": 0,
                "cachedTokens": 0, "totalTokens": 0,
                "requests": 0, "costUsd": 0.0, "models": set(), "lastActivity": None,
            })
            for field in ("inputTokens", "outputTokens", "cachedTokens", "totalTokens", "requests"):
                user[field] += entry[field]
            user["models"].add(model)
            if entry["lastActivity"] and (not user["lastActivity"] or entry["lastActivity"] > user["lastActivity"]):
                user["lastActivity"] = entry["lastActivity"]
            model_item = models.setdefault(model, {"model": model, "inputTokens": 0, "outputTokens": 0, "cachedTokens": 0, "totalTokens": 0, "requests": 0, "costUsd": 0.0})
            for field in ("inputTokens", "outputTokens", "cachedTokens", "totalTokens", "requests"):
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
            model_item = models.setdefault(model, {"model": model, "inputTokens": 0, "outputTokens": 0, "cachedTokens": 0, "totalTokens": 0, "requests": 0, "costUsd": 0.0})
            model_item["costUsd"] += cost

        cost_trend = await query_rows("""
            SELECT cost_date::date AS date, SUM(COALESCE(total_cost_usd, 0)) AS cost_usd
            FROM chatgpt_cost_user_detail
            WHERE """ + chatgpt_cost_period(period_key) + """
            GROUP BY cost_date::date ORDER BY cost_date::date
        """, {"period_key": period_key})
        for row in cost_trend or []:
            d = row.get("date")
            if d:
                key = d.isoformat() if hasattr(d, "isoformat") else str(d)
                point = daily.setdefault(key, {"date": key, "label": key, "tokens": 0, "requests": 0, "costUsd": 0.0})
                point["costUsd"] += float(row.get("cost_usd") or 0)

        department_rows = await query_rows("""
            SELECT COALESCE(NULLIF(TRIM(w.department), ''), 'Unassigned') AS department,
                   SUM(COALESCE(c.total_cost_usd, 0)) AS cost_usd
            FROM chatgpt_cost_user_detail c
            LEFT JOIN workday_employees w
              ON (LOWER(NULLIF(c.email, '')) = LOWER(NULLIF(w.email_work, ''))
                  OR NULLIF(c.user_id, '') = NULLIF(w.user_id, ''))
            WHERE """ + chatgpt_cost_period(period_key) + """
            GROUP BY COALESCE(NULLIF(TRIM(w.department), ''), 'Unassigned')
            ORDER BY cost_usd DESC
        """, {"period_key": period_key})
        departments = [
            {"department": row.get("department") or "Unassigned",
             "costUsd": round(float(row.get("cost_usd") or 0), 4)}
            for row in (department_rows or [])
        ]

        # Attach Workday department/title to each reporting user so the UI can show
        # them without a second frontend lookup. Missing Workday rows stay None.
        meta_by_email = {}
        try:
            meta_rows = await query_rows("""
                SELECT DISTINCT ON (LOWER(TRIM(w.email_work)))
                       LOWER(TRIM(w.email_work)) AS match_key,
                       NULLIF(TRIM(w.department), '') AS department,
                       NULLIF(TRIM(w.job_title), '') AS title
                FROM workday_employees w
                WHERE NULLIF(TRIM(w.email_work), '') IS NOT NULL
                ORDER BY LOWER(TRIM(w.email_work))
            """)
            meta_by_email = {
                (row.get("match_key") or "").lower(): (row.get("department"), row.get("title"))
                for row in (meta_rows or [])
            }
        except Exception:
            logger.warning("Workday enrichment unavailable for ChatGPT analytics", exc_info=True)

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
        total_cached = sum(u["cachedTokens"] for u in clean_users)
        return {
            "periodKey": period_key,
            "source": {"usage": "chatgpt_usage_user_detail", "cost": "chatgpt_cost_user_detail"},
            "kpis": {
                "activeUsers": len(clean_users), "totalTokens": total_tokens,
                "inputTokens": sum(u["inputTokens"] for u in clean_users),
                "outputTokens": sum(u["outputTokens"] for u in clean_users),
                "cachedTokens": total_cached,
                "requests": total_requests, "reportedCostUsd": round(total_cost, 4),
                "averageCostPerReportingUserUsd": round(total_cost / len(clean_users), 4) if clean_users else 0.0,
                "modelCount": len(clean_models),
            },
            "models": clean_models,
            "users": clean_users,
            "trend": points,
            "departments": departments,
        }
    except Exception as exc:
        logger.exception("ChatGPT report analytics query failed")
        raise HTTPException(status_code=503, detail=f"Could not build cloud analytics from usage/cost reports: {exc}") from exc
