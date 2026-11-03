# Branch changes since `main`

Base commit: `e066c8d` — `docs(db): add setup guide, assetiq_db FDW link, and schema-aligned seeds`

This branch contains the local database setup, deterministic Claude demo data, and the
backend/frontend changes that make the Claude tab read live PostgreSQL data instead of
`demoData.json`.

Server-only database instructions are in [`db/SERVER_DB_CHANGES.md`](db/SERVER_DB_CHANGES.md).

---

## 1. Local database setup (environment work, not committed)

The local PostgreSQL 18 instance was prepared with the files already in `db/`:

| Step | File | Result |
| --- | --- | --- |
| `tokeniq_db` schema | `db/simple.sql` | 5 telemetry tables |
| `assetiq_db` schema | `db/assetiq_schema.sql` | `public.workday_employees` (35 columns) |
| `assetiq_db` demo rows | `db/seed_assetiq_employees.sql` | 76 employees |
| FDW link | `db/fdw_workday.sql` | `assetiq_fdw.workday_employees`, `assetiq_server`, `assetiq_reader` mapping |
| `tokeniq_db` demo rows | `db/seed.sql` | Copilot 162 / 3 / 90, Claude 367 / 367 |

The two databases currently hold **demo data only**. Nothing in this branch changes
production data.

---

## 2. Database files changed

### `db/seed.sql`

- Replaced the two empty Claude sections with deterministic demo rows:
  - `claude_user_usage_report`: **367 rows**
  - `claude_user_cost_report`: **367 rows** (1:1 with usage)
  - Period: **Sep 1–30, 2026** and **Oct 1–22, 2026**
  - 24 actors: 23 employees + contractor `alex.mercer@vendorworks.io` (no Workday row)
  - Models: `claude-opus-4-1`, `claude-sonnet-4-5`, `claude-haiku-4-5`
  - `amount` / `list_amount` are stored in **cents**
  - Cost is computed from tokens × published per-model prices
- Updated both Claude sequence `setval` calls to `367, true`.
- Updated the header comments to describe 5 populated tables.
- The existing `TRUNCATE ... RESTART IDENTITY` still clears all 5 tables, so the file
  remains safe to re-run **locally only**.

### `db/README.md`

- Updated expected row counts for the two Claude tables.
- Extended the verification query to include Claude.
- Updated the “Regenerating the seeds” section: Copilot/employee rows come from
  `pg_dump`; Claude report rows are deterministic demo data, not a live dump.
- Documented that the backend reads normalized Claude tables that are not part of
  `simple.sql`.

---

## 3. Backend changes

### `backend/routes/claude.py` — rewritten

All three Claude endpoints now read the raw Anthropic report tables:

- `claude_user_usage_report`
- `claude_user_cost_report`

Endpoints:

| Endpoint | Change |
| --- | --- |
| `GET /api/claude/analytics` | Rewritten to aggregate usage and cost from the raw tables |
| `GET /api/claude/kpis` | Rewritten; seat cost + token cost, active/weekly users |
| `GET /api/claude/models` | Rewritten; tokens and cost per model |

Details:

- Usage and cost are aggregated independently before joining in Python, so multiple
  cost rows cannot multiply token counts.
- `amount` / `list_amount` are converted from cents to USD (`/100`).
- Token mapping:
  - `uncached_input_tokens` → input
  - `output_tokens` → output
  - `cache_read_input_tokens` → cache read
  - `ephemeral_5m_input_tokens + ephemeral_1h_input_tokens` → cache creation
- Response shape is unchanged, so `ClaudeTab.tsx` needed no data-shape changes.
- No fabricated fallback metrics are returned; an empty period returns zeroes.

### `backend/services/periods.py` — new raw-report filters

Added:

- `CLAUDE_USAGE_TABLE`, `CLAUDE_COST_TABLE`
- `claude_raw_usage_period(period_key, alias)`
- `claude_raw_cost_period(period_key, alias)`

Filter semantics:

- **Monthly** (`2026-09`, `2026-10`):
  `starting_at >= period start` **and** `ending_at <= period end + 1 day` (UTC).
- **Weekly** (`LATEST_WEEK`, `YYYY-Www`):
  `starting_at >= max(ending_at) - 7 days` **and** `ending_at <= max(ending_at)`.

### `backend/routes/analytics.py`

- Added `_claude_agg_cte(period_key)`.
- `GET /api/analytics/by-manager` and `GET /api/analytics/by-department` now use the
  raw Claude tables instead of `claude_usage_user_detail` / `claude_cost_user_detail`.
- Usage and cost are aggregated separately before the full join.
- Updated the Claude join-key metadata on `GET /api/employees/claude-joined` to
  reference `claude_user_usage_report.actor_email`.

### `backend/main.py`

- `/api/health` now reports `claude_user_usage_report` and `claude_user_cost_report`
  in `tables_used` instead of the unused normalized tables.

---

## 4. Frontend changes

### `frontend/src/services/api.ts`

- `getClaudeKpis()` and `getClaudeReportAnalytics()` now **always** call the backend.
- Removed the unused `demoClaudeReport` import.
- ChatGPT remains on the demo path (`VITE_USE_DUMMY_DATA` still applies to it).

### `frontend/vite.config.ts`

- Added a same-origin `/api` proxy to both `server` and `preview`:

```ts
proxy: {
  '/api': {
    target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8001',
    changeOrigin: true,
  },
}
```

- This makes the app work on the LAN (`http://<host>:3001`) without hardcoding
  `localhost:8001`, and prevents Vite from returning `index.html` for API calls.

---

## 5. Verification performed

### Database

| Check | Result |
| --- | --- |
| Claude usage / cost rows | 367 / 367 |
| Usage rows without cost | 0 |
| Cost rows without usage | 0 |
| `total_tokens` mismatches | 0 |
| Cost recomputation mismatches (> $0.01) | 0 |
| Actors | 24 |
| Rows not joined to Workday | 20 — Alex Mercer only |
| Date range | Sep 1 – Oct 22, 2026 |
| Re-running `seed.sql` | idempotent |

### Claude API

| Period | Users | Tokens | Token cost | Requests | Trend points |
| --- | --- | --- | --- | --- | --- |
| Oct 2026 | 24 | 38,368,283 | $122.6527 | 4,794 | 22 |
| Sep 2026 | 24 | 53,256,813 | $193.4456 | 6,659 | 30 |
| Latest 7 days | 17 | 14,900,419 | $53.549 | 1,864 | 7 |

Also verified:

- `/api/claude/kpis` monthly → 24 users, **$602.65** total (24 × $20 seats + $122.65 tokens)
- `/api/claude/kpis` weekly → **$138.55**
- `/api/claude/models` → Opus 4.1, Sonnet 4.5, Haiku 4.5 with tokens and cost
- `/api/analytics/by-manager` and `/api/analytics/by-department` → 200 with Claude data
- August 2026 → 200 with zero metrics (frontend shows its empty state)
- All Claude endpoints work through the Vite proxy on port 3001
- Copilot endpoints and `/api/dashboard/users` still return 200
- No backend errors in the logs

---

## 6. Known limitations / next steps

- **ChatGPT tab remains demo**: the `chatgpt_*` tables do not exist in `tokeniq_db`.
- **Overall UI KPI mixes demo ChatGPT**: the “Users on Any Platform” card can show
  **63 of 73** because it merges 9 demo ChatGPT-only users (`@example.com`) into
  live Workday data. The Excel export uses real data only and shows **58**
  (54 Workday + 4 non-Workday licensed users).
- `GET /api/employees/claude-joined` still uses the old normalized helper in
  `services/database.py`; the UI does not call it.
- Three Copilot emails have no Workday match (`lena.fischer`, `nikhil.saini`,
  `sam.rivera`) — intentional seed gap.
- Claude analytics includes the contractor Alex Mercer (no Workday row); the
  employee User Directory correctly excludes him.
- Claude Enterprise has a **20-seat minimum**; the app currently computes seats
  from active users, so an org with fewer than 20 Claude users would be understated.

---

## 7. Follow-up: Claude User Directory + Overall live (Option A)

Implemented after the first push:

- `/api/dashboard/users` Claude CTE now reads `claude_user_usage_report` /
  `claude_user_cost_report`:
  - usage and cost aggregated separately by email
  - cost converted from cents to USD
  - `ref_date` from `created_at`, `last_activity_date` from `starting_at`
- `/api/dashboard/trends` Claude series now reads `claude_user_usage_report`
  with the same monthly / last-7-days interval filter.
- The Claude Excel export (`tab=claude`) now reads the raw tables.
- `frontend/src/services/api.ts`: `getDashboardUsers()` and
  `getDashboardTrends()` always call the backend.
- Result:
  - Claude tab bottom User Directory → live (23 Workday employees with Claude
    usage in Sep/Oct; 16 in the latest 7 days)
  - Overall tab Copilot + Claude daily series → live
  - Overall per-user Claude columns → live
  - Claude Excel export → live
- ChatGPT remains on demo data.

---

## 8. Claude Enterprise seat price corrected to $20

Anthropic's public Enterprise price is **$20/seat/month** (billed annually,
20-seat minimum) plus usage at API rates. The app previously used $40.

- Updated `CLAUDE_BASE_SEAT_PRICE` to `20.0` in `backend/.env`,
  `backend/.env.example`, and the `services/database.py` default.
- Updated the backend example in `db/README.md` and the comment in
  `frontend/src/types/dashboard.ts`.
- Documented the full finding and sources in `CLAUDE_ENTERPRISE_BILLING.md`.
- Verified:
  - `/api/claude/kpis` monthly → **$602.65** (24 × $20 + $122.65 tokens)
  - `/api/claude/kpis` weekly → **$138.55**
  - Arjun Mehta modal → seat **$20.00** + token **$28.36** = **$48.36**
- The Claude tab's “Platform Spend” remains token-only; see the billing note for
  the open decision.

---

## 9. Excel export redesign

The export endpoint now returns a real `.xlsx` workbook (openpyxl), not a CSV
renamed to `.xlsx`.

- **Copilot** — 14 columns: Employee ID, Name, Email, Department, Title,
  EVP/Manager, Period, Copilot Status, Prompts, Prompts Work, Prompts Web,
  Apps Used, Active Days, Monthly Seat Cost.
  - Includes all Active Workday employees **plus** Copilot telemetry users with no
    Workday row.
  - Seat cost is charged only to licensed users.
- **Claude** — 18 columns: Employee ID, Name, Email, Department, Business
  Function, Title, EVP/Manager, Period, Claude Status, Requests, Input/Output/
  Cache Read/Cache Creation tokens, Total Tokens, Token Cost, Total Monthly Cost,
  Model.
  - One **Seat** row per user ($20 monthly / $5 weekly), then one row per model.
  - Includes reporting users with no Workday row (e.g. Alex Mercer).
- **ChatGPT** — 16 columns, with a visible “demo data” note until the
  `chatgpt_*` tables are loaded.
- **Overall** — 5 sheets:
  1. **Dashboard** — a "Combined AI Spend by Department" table (Department,
     Employees, Copilot/Claude/ChatGPT spend, Total), a horizontal bar chart of
     total spend by department, and three side-by-side provider tables
     (ChatGPT / Claude / Copilot) with Department, Users, Spend and a Total row.
     Only users with a provider licence are counted.
  2. **Overall** — 18 user-level columns, filtered to users with at least one
     provider licence (Copilot, Claude, or ChatGPT), whether or not they have a
     Workday row. October 2026: 58 users = 54 Workday + 4 non-Workday.
  3. **Copilot Oct 2026** — the Copilot sheet (sheet name includes the period).
  4. **Claude Oct 2026** — the Claude sheet.
  5. **ChatGPT Oct 2026** — the ChatGPT sheet (demo note while tables are absent).
- Non-Workday telemetry users are included in Copilot, Claude, and Overall with
  blank Workday fields and `Unassigned` department/EVP.
- Frontend: export timeout raised to 20 s; the offline fallback now downloads a
  real `.csv` instead of a mislabelled `.xlsx`.
- New dependency: `openpyxl>=3.1` in `requirements.txt` and `pyproject.toml`.

---

## 10. Provider-specific user modal

The shared `UserTable` detail modal now respects the active tab:

- **Copilot tab** — shows only the Copilot section and Copilot spend/power score.
- **Claude tab** — shows only the Claude section and Claude spend/power score.
- **Overall mode** — supports showing both providers (the Overall table itself
  already lists all provider columns).
- The modal no longer shows the combined total spend on provider-specific tabs.

---

## 11. Local-only files (not committed)

- `backend/.env` — local PostgreSQL credentials, port 8001
- `frontend/.env` — `VITE_API_URL=/`, proxy target, dev port 3001
- `backend/.venv/`, `frontend/node_modules/`
- `/tmp/opencode/gen_claude_seed.py` — one-off deterministic seed generator used to
  produce the Claude rows; not part of the repository
