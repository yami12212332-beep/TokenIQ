# TokenIQ — Enterprise AI Usage & Cost Intelligence

A full-stack dashboard for Microsoft 365 Copilot, Anthropic Claude, and OpenAI
ChatGPT usage/spend, enriched with Workday employee hierarchy data.

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS (`frontend/`)
- **Backend:** FastAPI + SQLAlchemy 2.0 async + asyncpg (`backend/`)
- **Databases:** PostgreSQL
  - `tokeniq_db` — telemetry tables
  - `assetiq_db` — employee master (`workday_employees`), read through
    `postgres_fdw` as `assetiq_fdw.workday_employees`

## Quick start

### 1. Databases

Full, copy-paste setup (schema, FDW link, seeds):

**→ [`db/README.md`](db/README.md)**

Short version:

```bash
createdb -U postgres tokeniq_db
psql -U postgres -d tokeniq_db -f db/simple.sql

createdb -U postgres assetiq_db
psql -U postgres -d assetiq_db -f db/assetiq_schema.sql
psql -U postgres -d assetiq_db -f db/seed_assetiq_employees.sql

# connect tokeniq_db -> assetiq_db (employee details)
psql -U postgres -d tokeniq_db -f db/fdw_workday.sql

# telemetry demo data
psql -U postgres -d tokeniq_db -f db/seed.sql
```

### 2. Environment

```bash
cp backend/.env.example backend/.env    # set DB_NAME=tokeniq_db + credentials
cp frontend/.env.example frontend/.env  # VITE_API_URL=http://127.0.0.1:8001
```

### 3. Run

```bash
# Backend → http://localhost:8001
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8001

# Frontend → http://localhost:3001
cd frontend
npm install
npm run dev
```

Health check: `http://127.0.0.1:8001/api/health`

## Data flow

| Tab | Source |
| --- | --- |
| Copilot | Live `tokeniq_db` (`copilot_*` tables) + employee details via the FDW |
| Overall | Live `/api/dashboard/users` + `/api/dashboard/trends` (Copilot + Claude); ChatGPT rows stay demo |
| Claude | Live `tokeniq_db` raw report tables (`claude_user_usage_report` / `claude_user_cost_report`) + FDW |
| ChatGPT | Frontend demo data while `VITE_USE_DUMMY_DATA=true` (the `chatgpt_*` tables are not in `simple.sql`) |

The backend rewrites `workday_employees` to `assetiq_fdw.workday_employees`, so
employee names, departments, and the EVP hierarchy come from `assetiq_db`.

## Project structure

```
backend/    FastAPI app (models, routes, services, schemas)
db/         schema, FDW setup, seeds, setup guide
frontend/   React + Vite dashboard
```

## Notes

- `.env` files, `node_modules`, and Python caches are git-ignored.
- `db/seed.sql` and `db/seed_assetiq_employees.sql` are safe to re-run (they
  `TRUNCATE` first).
