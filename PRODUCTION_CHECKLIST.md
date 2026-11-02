# Production deployment checklist

Use this before exposing TokenIQ on a production server. Tick every item.

---

## 1. Release & access

- [ ] Confirm the release commit/tag (current `main` head).
- [ ] You have SSH/deploy access to the target server.
- [ ] Change window agreed and stakeholders notified.
- [ ] Rollback plan available (previous commit/tag + DB backup).
- [ ] Server clock/timezone is **UTC** (all telemetry dates are UTC).

## 2. Infrastructure

- [ ] PostgreSQL **14+** (tested on 17).
- [ ] Python **3.11/3.12** and `pip` (or `uv`).
- [ ] Node.js **20/22** and `npm` for building the frontend.
- [ ] Reverse proxy (nginx/Apache) and a valid **TLS certificate**.
- [ ] Firewall: only 80/443 public; **5432/8001/3001 not public**.
- [ ] Enough disk for PostgreSQL data + backups + logs.

## 3. Databases

### `tokeniq_db` (telemetry)
- [ ] Database exists.
- [ ] On a **new/empty** DB only: `psql -U <user> -d tokeniq_db -f db/simple.sql`.
- [ ] Verify the 5 tables exist:
  `copilot_usage_user_detail`, `copilot_user_count_summary`,
  `copilot_user_count_trend`, `claude_user_usage_report`,
  `claude_user_cost_report`.
- [ ] Columns/types match `db/simple.sql` (no manual drift).
- [ ] Sequences are named `copilot_*_id_seq` / `claude_*_id_seq`.

### `assetiq_db` (employee master)
- [ ] Database exists with `public.workday_employees`.
- [ ] If missing: `psql -U <user> -d assetiq_db -f db/assetiq_schema.sql`.
- [ ] Production Workday data loaded (real loader, not demo seed).
- [ ] `manager_level_1_user_id` is **`bigint`** in `assetiq_db` (and the FDW
      foreign table). A varchar/bigint mismatch raises a PostgreSQL error.

### FDW link
- [ ] Edit `db/fdw_workday.sql` host/port/dbname/credentials for prod.
- [ ] `psql -U <user> -d tokeniq_db -f db/fdw_workday.sql`.
- [ ] `SELECT count(*) FROM assetiq_fdw.workday_employees;` returns the real employee count.
- [ ] Remote role (`assetiq_reader`) has **SELECT only** on `workday_employees`.

### Seed safety
- [ ] **Do NOT run on production:** `db/seed.sql`, `db/seed_assetiq_employees.sql`,
  `db/server_seed.sql` (they `TRUNCATE` first).
- [ ] `db/generate_seed.py` is legacy — do not use.

### Backups
- [ ] Full backup of both DBs taken before deploying.
- [ ] Restore has been tested.
- [ ] Scheduled backups + retention configured.

## 4. Backend configuration

- [ ] Create `backend/.env` (never commit it):
  ```dotenv
  APP_NAME=TokenIQ
  APP_ENV=production
  DEBUG=false
  HOST=0.0.0.0
  PORT=8001

  DB_HOST=<prod-db-host>
  DB_PORT=5432
  DB_NAME=tokeniq_db
  DB_USER=<app-user>
  DB_PASSWORD=<secret>

  CORS_ORIGINS=https://<your-prod-domain>
  COPILOT_SEAT_PRICE=30.0
  CLAUDE_BASE_SEAT_PRICE=20.0
  CHATGPT_SEAT_PRICE=30.0
  ```
- [ ] `CORS_ORIGINS` lists **only** the production frontend origin(s).
- [ ] Secrets come from a secret manager or protected file (`chmod 600`), not git.
- [ ] Python virtualenv created and dependencies installed:
  ```bash
  python3 -m venv .venv
  . .venv/bin/activate
  pip install -r requirements.txt      # includes openpyxl
  ```
- [ ] Run with a process manager (systemd/supervisor), restart on failure.
  - Linux example: `uvicorn main:app --host 0.0.0.0 --port 8001 --workers 2 --proxy-headers`
  - Windows: run uvicorn under a service wrapper (e.g. NSSM).
- [ ] Database user is least-privilege (read-only for dashboards; separate writer for loaders if needed).
- [ ] Logging enabled with rotation; no DEBUG logs in prod.
- [ ] Consider DB SSL (`sslmode=require`) and a connection pool size suited to the server.

## 5. Frontend build

- [ ] Create `frontend/.env` **before building**:
  ```dotenv
  # Same-origin via nginx proxy (recommended for prod)
  VITE_API_URL=/
  # development-only; not used by a production build
  VITE_API_PROXY_TARGET=http://127.0.0.1:8001
  VITE_USE_DUMMY_DATA=false
  ```
  Or set `VITE_API_URL=https://api.<your-domain>` and enable CORS.
- [ ] `VITE_USE_DUMMY_DATA=false` if you want Claude live and ChatGPT tables are loaded.
  (ChatGPT stays demo until `chatgpt_*` tables exist — see limitations.)
- [ ] Build:
  ```bash
  cd frontend
  npm ci
  npm run build
  ```
- [ ] Serve `frontend/dist` as static files; **do not run `npm run dev` in prod**.
- [ ] SPA fallback: unknown routes return `index.html`.
- [ ] Cache static assets (`/assets/*`) long, `index.html` short.
- [ ] nginx proxies `/api/*` to `http://127.0.0.1:8001/api/*`.

## 6. Security

- [ ] HTTPS only; redirect HTTP → HTTPS; HSTS enabled.
- [ ] No `.env`, secrets, dumps, or node_modules in the deployed artifact.
- [ ] CORS locked to the prod domain.
- [ ] Rate limiting / request size limits on the proxy.
- [ ] Dependency audit (`pip audit`, `npm audit`) reviewed.
- [ ] Database not reachable from the public internet.
- [ ] FDW credential is read-only and stored securely.

## 7. Data ingestion (production)

- [ ] Copilot loader populates `copilot_*` tables.
- [ ] Anthropic Claude loader populates `claude_user_usage_report` / `claude_user_cost_report`
      (`amount`/`list_amount` are stored in **cents**).
- [ ] ChatGPT loader (when available) populates `chatgpt_*` tables.
- [ ] Ingestion is idempotent per period and never truncates production tables.
- [ ] Spot-check row counts, nulls, and date ranges after the first run.

## 8. Post-deploy verification

```bash
curl -fsS https://<domain>/api/health
```
- [ ] Health returns `status: healthy`, `database_connected: true`.
- [ ] `/api/copilot/kpis?period_type=MONTHLY&period_key=YYYY-MM` returns data.
- [ ] `/api/claude/kpis?period_type=MONTHLY&period_key=YYYY-MM` returns data.
- [ ] `/api/dashboard/users?period_type=MONTHLY&period_key=YYYY-MM` returns employees.
- [ ] `/api/dashboard/trends?period_type=MONTHLY&period_key=YYYY-MM` returns points.
- [ ] Excel export works for `tab=copilot`, `tab=claude`, `tab=chatgpt`, `tab=overall`.
- [ ] Copilot Excel contains **only licensed users** (no `Never used`/`$0` Workday-only rows).
- [ ] Claude Excel contains reporting users, including non-Workday users.
- [ ] UI loads all tabs with no console errors.
- [ ] Page load and API latency are acceptable.

## 9. Observability

- [ ] Uptime monitor on `/api/health`.
- [ ] Log aggregation/retention configured.
- [ ] Alerts for 5xx rate, DB connection failures, disk space, and backup failures.
- [ ] PostgreSQL slow-query / connection-count monitoring.

## 10. Rollback

- [ ] Previous release commit/tag recorded.
- [ ] DB backup available.
- [ ] Rollback steps tested: stop service → restore code/DB if needed → restart → verify health.
- [ ] Ingestion jobs paused during rollback.

## 11. Known limitations

- ChatGPT tab/export uses demo data until `chatgpt_*` tables are loaded.
- Anthropic roster endpoint is restricted; Claude seats are derived from reporting users
  (Enterprise has a 20-seat minimum, so small orgs may be understated).
- Employee details require `assetiq_fdw.workday_employees`; without it, Workday fields are blank.
- Demo seeds must never run on production.
- Excel export requires `openpyxl` on the backend.
