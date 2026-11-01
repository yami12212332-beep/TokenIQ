"""
Translate the UI's period keys into date ranges / snapshot filters.

Weekly view: the scheduler fetches 7-day (D7) reports, so the weekly filter always
shows the LATEST fetched snapshot (key "LATEST_WEEK", or any ISO week key "YYYY-Www").
Monthly view: calendar month ("YYYY-MM") matched on the real date columns.

The UI sends calendar keys such as "2026-10" (month) or "2026-W42" (ISO week),
but the telemetry tables store Microsoft/Anthropic rolling-window labels in
`report_period` ("D7", "D28", "D30"). An exact `report_period = '2026-10'`
match therefore never hits, so queries also filter on the real date columns
(usage_date / cost_date / report_refresh_date) using the range from here.
"""
import re
from calendar import monthrange
from datetime import date, timedelta
from typing import Any, Dict, Optional, Tuple

_MONTH_RE = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")
_WEEK_RE = re.compile(r"^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$")


LATEST_WEEK_KEY = "LATEST_WEEK"


def is_weekly(period_key: Optional[str]) -> bool:
    key = (period_key or "").strip()
    return key == LATEST_WEEK_KEY or bool(_WEEK_RE.match(key))


def period_range(period_key: Optional[str]) -> Tuple[Optional[date], Optional[date]]:
    """(start, end) inclusive for "YYYY-MM" / "YYYY-Www"; (None, None) for anything else (e.g. "D30")."""
    key = (period_key or "").strip()
    if is_weekly(key):
        return None, None  # weekly = latest snapshot, not a date range
    m = _MONTH_RE.match(key)
    if m:
        year, month = int(m.group(1)), int(m.group(2))
        return date(year, month, 1), date(year, month, monthrange(year, month)[1])
    w = _WEEK_RE.match(key)
    if w:
        try:
            start = date.fromisocalendar(int(w.group(1)), int(w.group(2)), 1)
        except ValueError:
            return None, None
        return start, start + timedelta(days=6)
    return None, None


def period_params(period_key: Optional[str]) -> Dict[str, Any]:
    start, end = period_range(period_key)
    return {"period_start": start, "period_end": end}


# --- SQL fragments (need %(period_key)s, %(period_start)s, %(period_end)s) ---
# Each takes the period key the UI sent and returns a boolean SQL expression.

def claude_usage_period(period_key: Optional[str], alias: str = "") -> str:
    p = f"{alias}." if alias else ""
    if is_weekly(period_key):  # latest fetch only
        return f"{p}report_refresh_date = (SELECT MAX(report_refresh_date) FROM claude_usage_user_detail)"
    return f"({p}report_period = %(period_key)s OR {p}usage_date BETWEEN %(period_start)s AND %(period_end)s)"


def claude_cost_period(period_key: Optional[str], alias: str = "") -> str:
    p = f"{alias}." if alias else ""
    if is_weekly(period_key):
        return f"{p}report_refresh_date = (SELECT MAX(report_refresh_date) FROM claude_cost_user_detail)"
    return f"({p}report_period = %(period_key)s OR {p}cost_date BETWEEN %(period_start)s AND %(period_end)s)"


def copilot_detail_period(period_key: Optional[str], alias: str = "") -> str:
    """Copilot detail is a rolling-window snapshot table."""
    p = f"{alias}." if alias else ""
    if is_weekly(period_key):  # rows from the latest snapshot_fetched_at (same day = same scheduler run)
        return (
            f"CAST({p}snapshot_fetched_at AS date) = ("
            "SELECT MAX(CAST(snapshot_fetched_at AS date)) FROM copilot_usage_user_detail)"
        )
    return (
        f"({p}report_period = %(period_key)s OR {p}report_refresh_date = ("
        "SELECT MAX(report_refresh_date) FROM copilot_usage_user_detail "
        "WHERE report_refresh_date <= %(period_end)s))"
    )


def claude_cost_join_extra(period_key: Optional[str], alias: str = "c") -> str:
    """Extra join condition so weekly view only joins the latest cost snapshot (avoids double counting)."""
    if is_weekly(period_key):
        return f" AND {claude_cost_period(period_key, alias)}"
    return ""


def chatgpt_usage_period(period_key: Optional[str], alias: str = "") -> str:
    p = f"{alias}." if alias else ""
    if is_weekly(period_key):  # latest fetch only
        return f"{p}report_refresh_date = (SELECT MAX(report_refresh_date) FROM chatgpt_usage_user_detail)"
    return f"({p}report_period = %(period_key)s OR {p}usage_date BETWEEN %(period_start)s AND %(period_end)s)"


def chatgpt_cost_period(period_key: Optional[str], alias: str = "") -> str:
    p = f"{alias}." if alias else ""
    if is_weekly(period_key):
        return f"{p}report_refresh_date = (SELECT MAX(report_refresh_date) FROM chatgpt_cost_user_detail)"
    return f"({p}report_period = %(period_key)s OR {p}cost_date BETWEEN %(period_start)s AND %(period_end)s)"


def chatgpt_cost_join_extra(period_key: Optional[str], alias: str = "c") -> str:
    """Extra join condition so weekly view only joins the latest cost snapshot (avoids double counting)."""
    if is_weekly(period_key):
        return f" AND {chatgpt_cost_period(period_key, alias)}"
    return ""

