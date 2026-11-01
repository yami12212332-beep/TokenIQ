import React, { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle2, XCircle, RefreshCw, Database, Server } from 'lucide-react';
import { ApiService, type BackendHealth } from '../services/api';

export const HealthCheckTab: React.FC = () => {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    setError('');
    try {
      const result = await ApiService.getHealth();
      setHealth(result);
      if (result.database_connected !== true) setError('The API responded, but its database connection is not healthy.');
      setCheckedAt(new Date().toLocaleString());
    } catch (e) {
      setHealth(null);
      setError(e instanceof Error ? e.message : 'Unable to reach the backend API.');
      setCheckedAt(new Date().toLocaleString());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void check(); }, [check]);
  const connected = health?.database_connected === true && !error;

  return <section className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-slate-900">Backend health check</h2>
      <p className="mt-1 text-sm text-slate-500">Check API reachability and the PostgreSQL connection used by the dashboard.</p>
    </div>
    <div className={`rounded-2xl border p-5 ${connected ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {connected ? <CheckCircle2 className="text-emerald-600" size={28}/> : <XCircle className="text-rose-600" size={28}/>}
          <div>
            <div className="font-bold text-slate-900">{connected ? 'Backend and database connected' : 'Connection check failed'}</div>
            <div className="text-sm text-slate-600">{checkedAt ? `Last checked: ${checkedAt}` : 'Checking connection…'}</div>
          </div>
        </div>
        <button onClick={() => void check()} disabled={checking} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
          <RefreshCw size={15} className={checking ? 'animate-spin' : ''}/>{checking ? 'Checking…' : 'Check again'}
        </button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-white/70 p-3 text-sm text-rose-800">{error}</p>}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-slate-500"><Server size={18}/> Backend API</div>
        <div className="mt-2 font-semibold">{health ? 'Responding' : 'Unreachable'}</div>
        <div className="text-sm text-slate-500">Endpoint: /api/health</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-slate-500"><Database size={18}/> PostgreSQL</div>
        <div className="mt-2 font-semibold">{health?.database_connected ? 'Connected' : 'Not verified'}</div>
        <div className="text-sm text-slate-500">{health?.database || 'Waiting for backend response'}</div>
      </div>
    </div>
    {health && <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-slate-900">Database diagnostics</h3>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-slate-500">Query engine</dt><dd className="font-medium text-sky-700">{health.query_engine}</dd></div>
        <div><dt className="text-slate-500">Schema mode</dt><dd className="font-medium">{health.schema_mode}</dd></div>
      </dl>
      <h4 className="mt-5 font-semibold text-slate-800">Connected Tables (simple.sql)</h4>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {health.tables_used.map(table => <li key={table} className="flex items-center gap-2 text-sm text-slate-700"><Activity size={14} className="text-sky-500"/>{table}</li>)}
      </ul>
    </div>}

    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">SQLAlchemy 2.0 Table Models (simple.sql Schema)</h3>
          <p className="mt-0.5 text-xs text-slate-500">7 declarative ORM models mapped for backend DB connectivity &amp; query execution</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
          7 Tables Defined
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            model: "CopilotUsageUserDetail",
            table: "copilot_usage_user_detail",
            pk: "id (SERIAL)",
            fields: "23 columns",
            desc: "Copilot app activities, prompt counts, and active usage dates",
          },
          {
            model: "CopilotUserCountSummary",
            table: "copilot_user_count_summary",
            pk: "id (SERIAL)",
            fields: "22 columns",
            desc: "Enabled vs active user counts per M365 app",
          },
          {
            model: "CopilotUserCountTrend",
            table: "copilot_user_count_trend",
            pk: "id (SERIAL)",
            fields: "32 columns",
            desc: "Daily trend of active users and total prompts submitted",
          },
          {
            model: "ClaudeUsageUserDetail",
            table: "claude_usage_user_detail",
            pk: "id (SERIAL)",
            fields: "13 columns",
            desc: "Token consumption (input, output, cache read/write) by user and model",
          },
          {
            model: "ClaudeCostUserDetail",
            table: "claude_cost_user_detail",
            pk: "id (SERIAL)",
            fields: "14 columns",
            desc: "Dollar cost breakdown for Claude models and users",
          },
          {
            model: "ClaudeOrganizationUser",
            table: "claude_organization_users",
            pk: "user_id (VARCHAR)",
            fields: "7 columns",
            desc: "Claude roster, membership status, role, and license tier",
          },
          {
            model: "WorkdayEmployee",
            table: "workday_employees",
            pk: "employee_id (VARCHAR)",
            fields: "33 columns",
            desc: "HR Master hierarchy, departments, divisions, and EVP levels 1-9",
          },
        ].map((item, idx) => (
          <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold text-indigo-700">{item.model}</span>
              <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">{item.fields}</span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-600 truncate">{item.table}</div>
            <div className="mt-2 text-slate-500 leading-tight">{item.desc}</div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Primary Key:</span>
              <span className="font-mono font-medium text-slate-700">{item.pk}</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Table Joins & Relationships Card */}
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Configured Table Joins (Workday HR + Copilot &amp; Claude)</h3>
          <p className="mt-0.5 text-xs text-slate-500">Case-insensitive LOWER(email) matching with INNER JOIN filtering</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          INNER JOIN Active
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3.5 text-xs">
          <div className="flex items-center justify-between font-semibold text-slate-800">
            <span>Microsoft Copilot Join</span>
            <span className="rounded bg-sky-100 text-sky-800 px-1.5 py-0.5 text-[10px]">Copilot</span>
          </div>
          <div className="mt-2 font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/60 break-all">
            LOWER(workday_employees.email_work) == LOWER(copilot.user_principal_name)
          </div>
          <div className="mt-2 text-slate-500">
            Filters to employees with active Copilot prompts &amp; app activities.
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-mono">
            GET /api/employees/copilot-joined
          </div>
        </div>

        <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3.5 text-xs">
          <div className="flex items-center justify-between font-semibold text-slate-800">
            <span>Anthropic Claude Join</span>
            <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px]">Claude</span>
          </div>
          <div className="mt-2 font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/60 break-all">
            LOWER(workday_employees.email_work) == LOWER(claude_usage.email)
          </div>
          <div className="mt-2 text-slate-500">
            Links Workday departments with Claude token consumption &amp; USD costs.
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-mono">
            GET /api/employees/claude-joined
          </div>
        </div>

        <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3.5 text-xs">
          <div className="flex items-center justify-between font-semibold text-slate-800">
            <span>Unified Active AI Master</span>
            <span className="rounded bg-purple-100 text-purple-800 px-1.5 py-0.5 text-[10px]">Unified</span>
          </div>
          <div className="mt-2 font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/60 break-all">
            LOWER(workday_employees.email_work) IN (Copilot + Claude)
          </div>
          <div className="mt-2 text-slate-500">
            Aggregates cross-platform AI power users, prompt counts &amp; token spend.
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-mono">
            GET /api/employees/ai-active-joined
          </div>
        </div>
      </div>
    </div>
  </section>;
};
