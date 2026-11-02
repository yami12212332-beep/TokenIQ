# Database setup

TokenIQ uses **two PostgreSQL databases**:

| Database | Purpose | Tables |
| --- | --- | --- |
| `tokeniq_db` | AI telemetry (read/written by the backend) | `copilot_usage_user_detail`, `copilot_user_count_summary`, `copilot_user_count_trend`, `claude_user_usage_report`, `claude_user_cost_report` |
| `assetiq_db` | Employee master (HR / Workday) | `workday_employees` |

`tokeniq_db` does **not** store employee details. It reads them from
`assetiq_db.public.workday_employees` through a `postgres_fdw` foreign table
named `assetiq_fdw.workday_employees`. The backend automatically rewrites the
short name `workday_employees` in its SQL to `assetiq_fdw.workday_employees`.

## Files

| File | Purpose |
| --- | --- |
| `simple.sql` | Schema for `tokeniq_db` (5 telemetry tables) |
| `assetiq_schema.sql` | Schema for `assetiq_db.workday_employees` |
| `fdw_workday.sql` | Creates the `assetiq_db` foreign-data link inside `tokeniq_db` |
| `seed.sql` | Demo telemetry data for `tokeniq_db` (safe to re-run) |
| `seed_assetiq_employees.sql` | Demo employee data for `assetiq_db` (safe to re-run) |
| `server_seed.sql` | **Legacy** seed for the old 9-table schema — use `seed.sql` |
| `generate_seed.py` | **Legacy** generator for the old normalized schema — use the seeds above |

## Prerequisites

- PostgreSQL 14+ (tested on 17) with `psql` on `PATH`
- A role that can create databases (the examples use `postgres`)
- `postgres_fdw` is bundled with PostgreSQL — no extra install needed

Throughout, replace `postgres` / `1234` with your own superuser credentials.

---

## 1. Create `tokeniq_db` and its telemetry schema

```bash
createdb -U postgres tokeniq_db
psql -U postgres -d tokeniq_db -f db/simple.sql
```

This creates the five telemetry tables (zero views, zero extra indexes).

## 2. Create `assetiq_db` and the employee master

```bash
createdb -U postgres assetiq_db
psql -U postgres -d assetiq_db -f db/assetiq_schema.sql
psql -U postgres -d assetiq_db -f db/seed_assetiq_employees.sql
```

`assetiq_schema.sql` creates `public.workday_employees` with 35 columns
(employee_id identity PK, unique user_id, 9 manager levels, indexes).
`seed_assetiq_employees.sql` loads 76 demo employees.

### Create the read-only role used by the FDW

Run this against **`assetiq_db`** (skip the `CREATE ROLE` if the role exists):

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'assetiq_reader') THEN
    CREATE ROLE assetiq_reader LOGIN PASSWORD 'employee';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE assetiq_db TO assetiq_reader;
GRANT USAGE ON SCHEMA public TO assetiq_reader;
GRANT SELECT ON public.workday_employees TO assetiq_reader;
```

## 3. Link `tokeniq_db` → `assetiq_db` (foreign data wrapper)

Run this against **`tokeniq_db`**:

```bash
psql -U postgres -d tokeniq_db -f db/fdw_workday.sql
```

`fdw_workday.sql` creates:

- `CREATE EXTENSION postgres_fdw`
- schema `assetiq_fdw`
- server `assetiq_server` → `dbname=assetiq_db host=localhost port=5432`
- user mapping `postgres` (local) → `assetiq_reader` (remote)
- foreign table `assetiq_fdw.workday_employees`

Adjust the host/port/dbname/user/password at the top of the file for your
environment. Verify the link:

```sql
SELECT count(*) FROM assetiq_fdw.workday_employees;   -- expected: 76
```

## 4. Seed telemetry into `tokeniq_db`

```bash
psql -U postgres -d tokeniq_db -f db/seed.sql
```

`seed.sql` starts with a `TRUNCATE ... RESTART IDENTITY`, so re-running gives a
clean dataset. Expected row counts:

| Table | Rows |
| --- | --- |
| `copilot_usage_user_detail` | 162 |
| `copilot_user_count_summary` | 3 |
| `copilot_user_count_trend` | 90 |
| `claude_user_usage_report` | 367 (Sep 1-30 + Oct 1-22 2026) |
| `claude_user_cost_report` | 367 (1:1 with usage, amounts in cents) |

Verify:

```sql
SELECT 'copilot_usage', count(*) FROM copilot_usage_user_detail
UNION ALL SELECT 'copilot_summary', count(*) FROM copilot_user_count_summary
UNION ALL SELECT 'copilot_trend', count(*) FROM copilot_user_count_trend
UNION ALL SELECT 'claude_usage', count(*) FROM claude_user_usage_report
UNION ALL SELECT 'claude_cost', count(*) FROM claude_user_cost_report;
```

## 5. Configure environment

### Backend — `backend/.env`

```dotenv
APP_NAME=TokenIQ
APP_ENV=development
DEBUG=true

HOST=0.0.0.0
PORT=8001

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=tokeniq_db
DB_USER=postgres
DB_PASSWORD=1234

CORS_ORIGINS=http://localhost:3001,http://127.0.0.1:3001,http://localhost:3000,http://127.0.0.1:3000
COPILOT_SEAT_PRICE=30.0
CLAUDE_BASE_SEAT_PRICE=20.0
CHATGPT_SEAT_PRICE=30.0
```

The backend only needs the `tokeniq_db` connection. Employee rows arrive through
the FDW, so `assetiq_db` credentials live in the **user mapping** created in
step 3, not in `backend/.env`.

### Frontend — `frontend/.env`

```dotenv
VITE_API_URL=http://127.0.0.1:8001
VITE_DEV_HOST=0.0.0.0
VITE_DEV_PORT=3001
# true = Overall/Claude/ChatGPT read src/data/demoData.json.
# Copilot always reads the backend live, regardless of this flag.
VITE_USE_DUMMY_DATA=true
```

> `.env` files are git-ignored. Copy them from `.env.example`.

## 6. Run

```bash
# Backend
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8001

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:3001. Check the backend:

```bash
curl http://127.0.0.1:8001/api/health
```

## How the employee join works

The backend prefers `assetiq_fdw.workday_employees` and falls back to a local
`public.workday_employees` if the FDW schema is absent. Joins are
case-insensitive:

```sql
LOWER(workday_employees.email_work) = LOWER(copilot_usage_user_detail.user_principal_name)
-- or on user_id
workday_employees.user_id = <telemetry>.user_id
```

This is why employee names/departments/EVP hierarchy must exist in
`assetiq_db.workday_employees`.

### Column type note

`manager_level_1_user_id` is **`bigint`** (a numeric Workday user id) in both
`assetiq_schema.sql` and the FDW foreign table. The bundled demo seed uses
`1000` for the CEO. If your production Workday feed uses numeric ids for the
other levels (`manager_level_2_user_id` … `manager_level_9_user_id`), convert
those columns the same way and update the FDW foreign table to match — the
remote and foreign-table types must be identical or PostgreSQL raises an error.

## Regenerating the seeds

Copilot rows and the employee seed were produced from a live DB with `pg_dump --inserts`:

```bash
# tokeniq_db Copilot telemetry
pg_dump -a --inserts --rows-per-insert=50 --no-owner --no-privileges \
  -t copilot_usage_user_detail -t copilot_user_count_summary \
  -t copilot_user_count_trend tokeniq_db

# assetiq_db employees
pg_dump -a --inserts --rows-per-insert=50 --no-owner --no-privileges \
  -t workday_employees assetiq_db
```

Then prepend a `TRUNCATE ... RESTART IDENTITY;` to the dump output.

The two Claude report tables are deterministic demo data written in the raw
Anthropic Analytics API shape (Sep 1-30 + Oct 1-22 2026, 367 usage rows and one
cost row per usage row, `amount` / `list_amount` in cents). They are not dumped
from a live DB.

## Notes

- `report_period` stores the provider's rolling-window label (`D7`, `D30`), not a
  calendar month. The UI sends `YYYY-MM` and the API filters on real date columns.
- Sequence names must match the table names (`copilot_*_id_seq`). If you copied
  tables from an older schema, rename the sequences so `seed.sql`'s `setval`
  calls resolve.
- Copilot and Claude read live data. Claude uses `claude_user_usage_report` /
  `claude_user_cost_report` directly. ChatGPT remains on frontend demo data while
  `VITE_USE_DUMMY_DATA=true`; its normalized tables are not part of `simple.sql`.
