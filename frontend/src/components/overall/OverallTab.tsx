import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, Layers3, Users, UserCheck, Info, Search, X, Filter } from 'lucide-react';
import type { TimeGrain, TrendDataPoint, UnifiedUser } from '../../types/dashboard';
import { MetricCard } from '../common/MetricCard';
import { DonutChart, TrendLineChart } from '../common/Charts';
import { formatNumber, formatTokens, formatUSD } from '../../utils/analytics';
import { ApiService } from '../../services/api';
import {
  PLATFORM_META,
  buildChatGPTStub,
  computeOverall,
  type OverallChatGPTRow,
  type PlatformId,
} from '../../utils/overall';

interface OverallTabProps {
  users: UnifiedUser[];
  trend: TrendDataPoint[];
  timeGrain: TimeGrain;
  periodKey: string;
}

type ChatGPTSource = 'database' | 'sample';

const platformOrder: PlatformId[] = ['copilot', 'claude', 'chatgpt'];

export const OverallTab: React.FC<OverallTabProps> = ({ users, trend, timeGrain, periodKey }) => {
  const [chatgptRows, setChatgptRows] = useState<OverallChatGPTRow[] | null>(null);
  const [source, setSource] = useState<ChatGPTSource>('sample');
  const [providerSpend, setProviderSpend] = useState<Partial<Record<PlatformId, number>>>({});
  const [userQuery, setUserQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('ALL');
  const [selectedSpendSegmentFilter, setSelectedSpendSegmentFilter] = useState<string>('ALL');
  const [spendBreakdown, setSpendBreakdown] = useState<'department' | 'evp'>('department');

  // ChatGPT rows come from the same data source as the ChatGPT tab:
  // demoData.json in demo mode, /api/overall/chatgpt-users when VITE_USE_DUMMY_DATA=false.
  useEffect(() => {
    let cancelled = false;

    ApiService.getOverallChatGPTUsers(timeGrain, periodKey)
      .then((response) => {
        if (cancelled) return;
        if (response.source === 'unavailable') {
          setChatgptRows(null);
          setSource('sample');
          return;
        }
        setChatgptRows(response.rows);
        setSource(response.source);
      })
      .catch(() => {
        if (cancelled) return;
        setChatgptRows(null);
        setSource('sample');
      });

    return () => {
      cancelled = true;
    };
  }, [timeGrain, periodKey]);

  // Per-platform cards are labeled "reported by each provider tab", so use the
  // exact spend total each provider tab shows. Deriving it from the merged user
  // rows mixes seat + token costs (Claude) or uses a different Copilot payload,
  // which is why those cards did not match the provider tabs.
  useEffect(() => {
    let cancelled = false;
    setProviderSpend({});

    ApiService.getCopilotDatabaseKpis(timeGrain, periodKey)
      .then((kpis) => {
        if (!cancelled) {
          setProviderSpend((prev) => ({ ...prev, copilot: kpis.totalMonthlySpend }));
        }
      })
      .catch(() => {
        // Keep the row-derived allocation if the Copilot KPI endpoint is down.
      });

    ApiService.getClaudeReportAnalytics(periodKey)
      .then((report) => {
        if (!cancelled) {
          setProviderSpend((prev) => ({ ...prev, claude: report.kpis.reportedCostUsd }));
        }
      })
      .catch(() => {
        // Keep the row-derived allocation if the Claude report is unavailable.
      });

    ApiService.getChatGPTReportAnalytics(periodKey)
      .then((report) => {
        if (!cancelled) {
          setProviderSpend((prev) => ({ ...prev, chatgpt: report.kpis.reportedCostUsd }));
        }
      })
      .catch(() => {
        // Keep the row-derived allocation if the ChatGPT report is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [timeGrain, periodKey]);

  const gptRows = useMemo(
    () => chatgptRows ?? buildChatGPTStub(users, timeGrain === 'WEEKLY'),
    [chatgptRows, users, timeGrain],
  );

  const summary = useMemo(
    () => computeOverall(users, gptRows, true, providerSpend),
    [users, gptRows, providerSpend],
  );
  const maxPlatformSpend = Math.max(1, ...summary.platforms.map((p) => p.spend));
  const employeeByEmail = useMemo(() => new Map(users.map((u) => [
    (u.employee.email || '').toLowerCase(), u.employee,
  ])), [users]);
  const spendBreakdownRows = useMemo(() => {
    if (spendBreakdown === 'department') {
      return summary.departments.map((d) => ({ key: d.department, label: d.department, ...d }));
    }
    const grouped = new Map<string, { key: string; label: string; copilot: number; claude: number; chatgpt: number; total: number }>();
    for (const row of summary.allUsers) {
      const employee = employeeByEmail.get(row.email);
      const id = employee?.managerLevel3UserId?.trim() || 'Unassigned';
      const label = employee?.managerLevel3UserName?.trim() || id;
      const current = grouped.get(id) ?? { key: id, label, copilot: 0, claude: 0, chatgpt: 0, total: 0 };
      current.copilot += row.copilotSpend;
      current.claude += row.claudeSpend;
      current.chatgpt += row.chatgptSpend;
      current.total += row.totalSpend;
      grouped.set(id, current);
    }
    return [...grouped.values()].sort((a, b) => b.total - a.total);
  }, [spendBreakdown, summary.departments, summary.allUsers, employeeByEmail]);
  const maxDeptSpend = Math.max(1, ...spendBreakdownRows.map((d) => d.total));

  const departmentList = useMemo(() => {
    const depts = new Set<string>();
    summary.allUsers.forEach((u) => {
      if (u.department) depts.add(u.department);
    });
    return Array.from(depts).sort();
  }, [summary.allUsers]);

  const hasActiveFilters = 
    userQuery.trim().length > 0 ||
    selectedDeptFilter !== 'ALL' ||
    selectedPlatformFilter !== 'ALL' ||
    selectedSpendSegmentFilter !== 'ALL';

  const visibleUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    
    let rows = summary.allUsers;

    // Filter by search query
    if (q) {
      rows = rows.filter((r) => {
        const platforms = r.licensed.map((id) => PLATFORM_META[id].name).join(' ');
        return `${r.name} ${r.email} ${r.department} ${platforms}`.toLowerCase().includes(q);
      });
    }

    // Filter by department
    if (selectedDeptFilter !== 'ALL') {
      rows = rows.filter((r) => r.department === selectedDeptFilter);
    }

    // Filter by platform
    if (selectedPlatformFilter !== 'ALL') {
      if (selectedPlatformFilter === 'multi') {
        rows = rows.filter((r) => r.licensed.length > 1);
      } else {
        rows = rows.filter((r) => r.licensed.includes(selectedPlatformFilter as PlatformId));
      }
    }

    // Filter by spend level
    if (selectedSpendSegmentFilter === 'high') {
      rows = rows.filter((r) => r.totalSpend >= 50);
    } else if (selectedSpendSegmentFilter === 'medium') {
      rows = rows.filter((r) => r.totalSpend >= 20 && r.totalSpend < 50);
    } else if (selectedSpendSegmentFilter === 'low') {
      rows = rows.filter((r) => r.totalSpend < 20);
    }

    // Default view when no filters active: top 10 users by combined spend
    if (!hasActiveFilters) {
      return summary.topUsers;
    }

    // When filters active, return up to 50 matching users sorted by total spend
    return [...rows].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 50);
  }, [summary.allUsers, summary.topUsers, userQuery, selectedDeptFilter, selectedPlatformFilter, selectedSpendSegmentFilter, hasActiveFilters]);

  return (
    <div className="space-y-6">
    

      {/* Headline KPIs */}
      <section aria-label="Overall KPIs" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total AI Spend"
          value={formatUSD(summary.totalSpend)}
          subtext="Copilot + Claude + ChatGPT"
          icon={DollarSign}
          variant="highlight"
        />
        <MetricCard
          label="Users on Any Platform"
          value={formatNumber(summary.usersAnyPlatform)}
          subtext={`of ${formatNumber(summary.employeesInScope)} employees`}
          icon={Users}
        />
        <MetricCard
          label="Active Users"
          value={formatNumber(summary.activeAnyPlatform)}
          subtext="Active on at least one platform"
          icon={UserCheck}
        />
        <MetricCard
          label="Multi-Platform Users"
          value={formatNumber(summary.multiPlatform)}
          subtext={`Avg spend / user ${formatUSD(summary.avgSpendPerUser)}`}
          icon={Layers3}
        />
      </section>

      {/* Per-platform cards */}
      <section aria-label="Platform comparison" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summary.platforms.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                <span className="text-sm font-bold text-slate-900">{p.name}</span>
              </div>
              {p.id === 'chatgpt' && source === 'sample' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Sample
                </span>
              )}
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900">{formatUSD(p.spend)}</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-500">
              <div>
                <div className="font-semibold text-slate-800">{formatNumber(p.licensed)}</div>
                Users
              </div>
              <div>
                <div className="font-semibold text-slate-800">{formatNumber(p.active)}</div>
                Active
              </div>
              <div>
                <div className="font-semibold text-slate-800">
                  {p.volumeLabel === 'tokens' ? formatTokens(p.volume) : formatNumber(p.volume)}
                </div>
                {p.volumeLabel === 'tokens' ? 'Tokens' : 'Prompts'}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Spend share + overlap */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Spend by Platform</h3>
          <p className="text-xs text-slate-500 mb-4">Spend reported by each provider tab for the selected period</p>
          <div className="space-y-3">
            {summary.platforms.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">{p.name}</span>
                  <span className="text-slate-500">
                    {formatUSD(p.spend)} ·{' '}
                    {summary.totalSpend > 0 ? Math.round((p.spend / summary.totalSpend) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(p.spend / maxPlatformSpend) * 100}%`, background: p.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Platform Overlap</h3>
          <p className="text-xs text-slate-500 mb-4">How many tools each user has</p>
          <DonutChart
            segments={summary.combos.map((c) => ({ name: c.name, count: c.count, color: c.color }))}
            totalLabel="Users"
            size={170}
          />
        </div>
      </section>

      {/* Trend + department */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Daily Active Users</h3>
          <p className="text-xs text-slate-500 mb-3">Copilot and Claude (ChatGPT daily trend: coming with the ChatGPT tables)</p>
          <TrendLineChart
            data={trend}
            series={[
              { key: 'copilotActive', name: 'Copilot', color: PLATFORM_META.copilot.color, strokeWidth: 2.5 },
              { key: 'claudeActive', name: 'Claude', color: PLATFORM_META.claude.color, strokeWidth: 2.5 },
            ]}
            height={240}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Spend by {spendBreakdown === 'department' ? 'Department' : 'EVP'}</h3>
              <p className="mt-1 text-xs text-slate-500">Provider-reported spend grouped by {spendBreakdown === 'department' ? 'employee department' : 'Workday EVP hierarchy'}</p>
            </div>
            <div className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
              {(['department', 'evp'] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => setSpendBreakdown(mode)} className={`cursor-pointer rounded px-2.5 py-1 ${spendBreakdown === mode ? 'bg-white font-semibold text-sky-700 shadow-sm' : 'text-slate-600'}`}>
                  {mode === 'department' ? 'Department' : "EVP's"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 text-[11px] text-slate-500 mb-3">
            {platformOrder.map((id) => (
              <span key={id} className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm" style={{ background: PLATFORM_META[id].color }} />
                {PLATFORM_META[id].name}
              </span>
            ))}
          </div>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {spendBreakdownRows.length === 0 && (
              <div className="text-sm text-slate-400 py-6 text-center">No spend recorded for this {spendBreakdown === 'department' ? 'period' : 'EVP hierarchy'}</div>
            )}
            {spendBreakdownRows.map((d) => (
              <div key={d.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 truncate pr-2">{d.label}</span>
                  <span className="text-slate-500 shrink-0">{formatUSD(d.total)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden flex" style={{ width: `${(d.total / maxDeptSpend) * 100}%` }}>
                  <div style={{ width: `${(d.copilot / d.total) * 100}%`, background: PLATFORM_META.copilot.color }} />
                  <div style={{ width: `${(d.claude / d.total) * 100}%`, background: PLATFORM_META.claude.color }} />
                  <div style={{ width: `${(d.chatgpt / d.total) * 100}%`, background: PLATFORM_META.chatgpt.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top users */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {hasActiveFilters ? 'Filtered Users by Combined Spend' : 'Top 10 Users by Combined Spend'}
              </h3>
              <p className="text-xs text-slate-500">
                {hasActiveFilters ? `Showing ${visibleUsers.length} matching employees` : 'Highest total AI expenditure across Copilot, Claude, and ChatGPT'}
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search name, email, department…"
                aria-label="Search users"
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
              />
              {userQuery && (
                <button
                  type="button"
                  onClick={() => setUserQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-semibold mr-1">
              <Filter size={13} className="text-slate-400" />
              <span>Filters:</span>
            </div>

            {/* Department Filter */}
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Departments ({departmentList.length})</option>
              {departmentList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Platform Filter */}
            <select
              value={selectedPlatformFilter}
              onChange={(e) => setSelectedPlatformFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Platforms</option>
              <option value="copilot">Microsoft Copilot</option>
              <option value="claude">Anthropic Claude</option>
              <option value="chatgpt">OpenAI ChatGPT</option>
              <option value="multi">Multi-Platform (2+ Tools)</option>
            </select>

            {/* Spend Segment Filter */}
            <select
              value={selectedSpendSegmentFilter}
              onChange={(e) => setSelectedSpendSegmentFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Spend Levels</option>
              <option value="high">High Spend ($50+ / mo)</option>
              <option value="medium">Medium Spend ($20–$50 / mo)</option>
              <option value="low">Light Spend (&lt;$20 / mo)</option>
            </select>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setUserQuery('');
                  setSelectedDeptFilter('ALL');
                  setSelectedPlatformFilter('ALL');
                  setSelectedSpendSegmentFilter('ALL');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer transition-colors"
              >
                <X size={12} />
                Reset Filters
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50 border-y border-slate-200">
                <th className="py-2.5 px-4 font-semibold">User</th>
                <th className="py-2.5 px-3 font-semibold">Department</th>
                <th className="py-2.5 px-3 font-semibold">Platforms</th>
                <th className="py-2.5 px-3 font-semibold text-right">Copilot</th>
                <th className="py-2.5 px-3 font-semibold text-right">Claude</th>
                <th className="py-2.5 px-3 font-semibold text-right">ChatGPT</th>
                <th className="py-2.5 px-4 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-slate-400">No users match "{userQuery}"</td></tr>}
              {visibleUsers.map((r) => (
                <tr key={r.key} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 px-4 font-medium text-slate-800">{r.name}</td>
                  <td className="py-2.5 px-3 text-slate-600">{r.department}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1">
                      {r.licensed.map((id) => (
                        <span
                          key={id}
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: PLATFORM_META[id].color }}
                          title={PLATFORM_META[id].name}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{formatUSD(r.copilotSpend)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{formatUSD(r.claudeSpend)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{formatUSD(r.chatgptSpend)}</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-slate-900">{formatUSD(r.totalSpend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
