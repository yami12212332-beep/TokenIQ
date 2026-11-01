# Server database changes (apply on pull)

This file lists **only the database changes made on the local machine** that must be
reflected on the server when this branch is pulled and deployed.

> **Demo data warning:** the local `db/seed.sql` and `db/seed_assetiq_employees.sql`
> contain demo rows. Do **not** run them on the server — they `TRUNCATE` the target
> tables first. Production data must come from the real ingestion loaders.

---

## 1. What was created locally

### `tokeniq_db` — 5 telemetry tables (`db/simple.sql`)

| Table | Local demo rows | Server action |
| --- | --- | --- |
| `copilot_usage_user_detail` | 162 | Ensure table exists; keep server data |
| `copilot_user_count_summary` | 3 | Ensure table exists; keep server data |
| `copilot_user_count_trend` | 90 | Ensure table exists; keep server data |
| `claude_user_usage_report` | 367 | Ensure table exists; populate with the production Claude loader |
| `claude_user_cost_report` | 367 | Ensure table exists; populate with the production Claude loader |

No columns, indexes, or constraints were changed in this branch. The two Claude report
tables already match the columns written by the Anthropic Analytics loader
(`claude_usage_cost_loader.py`).

### `assetiq_db` — employee master

| Object | Local demo rows | Server action |
| --- | --- | --- |
| `public.workday_employees` | 76 | Ensure table exists; keep the real Workday data |

### `tokeniq_db` — foreign-data link

Created by `db/fdw_workday.sql`:

| Object | Purpose |
| --- | --- |
| `assetiq_fdw` schema | Local schema for the foreign table |
| `assetiq_server` | `postgres_fdw` server pointing at `assetiq_db` |
| user mapping `postgres → assetiq_reader` | Remote credentials |
| `assetiq_fdw.workday_employees` | Foreign table read by the backend |
| role `assetiq_reader` | Read-only role on `assetiq_db` |

Adjust host, port, database, user, and password in `db/fdw_workday.sql` for the server
before running it.

---

## 2. What the backend now expects

The Claude routes in this branch read these two tables directly:

- `claude_user_usage_report`
- `claude_user_cost_report`

They are filtered on the report interval:

- Monthly: `starting_at >= period start` and `ending_at <= period end + 1 day` (UTC)
- Weekly: the last 7 days ending at `MAX(ending_at)`

Cost values are stored in **cents**; the backend converts them to USD (`/100`).
No schema change is required for this — only the tables and data must exist.

The backend also joins employee details through `assetiq_fdw.workday_employees`.

---

## 3. Do NOT run on the server

| File | Why |
| --- | --- |
| `db/seed.sql` | Truncates all 5 telemetry tables and inserts demo Copilot + Claude rows |
| `db/seed_assetiq_employees.sql` | Truncates `workday_employees` and inserts 76 demo employees |
| `db/server_seed.sql` | Legacy seed for the old normalized schema |
| `db/generate_seed.py` | Legacy generator for the old normalized schema |

`db/simple.sql` and `db/assetiq_schema.sql` use `CREATE TABLE` / `CREATE TABLE IF NOT EXISTS`.
Only run `db/simple.sql` on a new/empty `tokeniq_db`; it does not alter existing tables.

---

## 4. Server apply checklist

1. **Verify `tokeniq_db` tables**
   ```sql
   \dt public.*
   ```
   If the 5 telemetry tables are missing, run:
   ```bash
   psql -U <user> -d tokeniq_db -f db/simple.sql
   ```

2. **Verify `assetiq_db.workday_employees`**
   ```bash
   psql -U <user> -d assetiq_db -f db/assetiq_schema.sql
   ```
   The script uses `IF NOT EXISTS`, so it is safe when the table already exists.

3. **Ensure the read-only role and grants**
   ```sql
   DO $$
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'assetiq_reader') THEN
       CREATE ROLE assetiq_reader LOGIN PASSWORD '<password>';
     END IF;
   END
   $$;
   GRANT CONNECT ON DATABASE assetiq_db TO assetiq_reader;
   GRANT USAGE ON SCHEMA public TO assetiq_reader;
   GRANT SELECT ON public.workday_employees TO assetiq_reader;
   ```

4. **Create the FDW link in `tokeniq_db`**
   ```bash
   psql -U <user> -d tokeniq_db -f db/fdw_workday.sql
   ```
   Edit the server host/port/dbname and user-mapping password first.

5. **Populate the Claude report tables with production data**
   Run the Anthropic Analytics loader for the required months, e.g.:
   ```bash
   python claude_usage_cost_loader.py --month 2026-10
   ```
   The loader writes `claude_user_usage_report` and `claude_user_cost_report` and is
   safe to re-run per month.

6. **Do not load demo seeds on production.**

---

## 5. Verification

```sql
-- tokeniq_db
SELECT 'copilot_usage', count(*) FROM copilot_usage_user_detail
UNION ALL SELECT 'copilot_summary', count(*) FROM copilot_user_count_summary
UNION ALL SELECT 'copilot_trend', count(*) FROM copilot_user_count_trend
UNION ALL SELECT 'claude_usage', count(*) FROM claude_user_usage_report
UNION ALL SELECT 'claude_cost', count(*) FROM claude_user_cost_report;

-- FDW link (should equal the server employee count)
SELECT count(*) FROM assetiq_fdw.workday_employees;

-- Usage/cost coverage for a month
SELECT to_char(u.starting_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
       count(*) AS usage_rows,
       count(*) FILTER (WHERE c.id IS NULL) AS usage_without_cost
FROM claude_user_usage_report u
LEFT JOIN claude_user_cost_report c
  ON c.actor_email = u.actor_email
 AND c.model = u.model
 AND c.starting_at = u.starting_at
GROUP BY 1
ORDER BY 1;
```

Expected after the local demo seed (for reference only):

| Check | Local value |
| --- | --- |
| `claude_user_usage_report` | 367 |
| `claude_user_cost_report` | 367 |
| Usage without cost | 0 |
| FDW employees | 76 |
| Sep 2026 | 210 rows, $193.45 token cost |
| Oct 2026 | 157 rows, $122.65 token cost |

---

## 6. Notes

- `amount` and `list_amount` are in **cents** (fractional minor units). Do not convert
  them in the database; the backend divides by 100 for the API response.
- The local seed uses one `created_at` value (2026-10-23); production rows come from the
  loader with their real `created_at` / `updated_at`.
- The old normalized Claude tables (`claude_usage_user_detail`, `claude_cost_user_detail`,
  `claude_organization_users`) are **not** used by the new Claude routes. Some dashboard
  endpoints still reference them, so do not drop them on the server without checking
  `/api/dashboard/users` and `/api/dashboard/trends`.
- No destructive migration is included in this branch. All local setup was done on an
  empty database; the server must not be truncated.
