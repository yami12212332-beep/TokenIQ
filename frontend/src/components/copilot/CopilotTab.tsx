import React, { useEffect, useState } from 'react';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Activity, 
  Laptop
} from 'lucide-react';
import { 
  UnifiedUser, 
  TrendDataPoint, 
  DepartmentSummary, 
  ManagerSummary,
  DepartmentName,
  TimeGrain,
  PlatformKPIs
} from '../../types/dashboard';
import { 
  formatUSD, 
  formatNumber
} from '../../utils/analytics';
import { ApiService } from '../../services/api';
import { MetricCard } from '../common/MetricCard';
import { 
  TrendLineChart, 
  StackedHorizontalBarChart, 
  DonutChart
} from '../common/Charts';

interface CopilotTabProps {
  users: UnifiedUser[];
  trend: TrendDataPoint[];
  departments: DepartmentSummary[];
  managers: ManagerSummary[];
  selectedDept: DepartmentName | 'ALL';
  onSelectDept: (dept: DepartmentName) => void;
  selectedManager: string | 'ALL';
  onSelectManager: (manager: string) => void;
  timeGrain?: TimeGrain;
  periodKey?: string;
}

const APPS = [
  { key: 'chat', label: 'Chat' },
  { key: 'teams', label: 'Teams' },
  { key: 'word', label: 'Word' },
  { key: 'excel', label: 'Excel' },
  { key: 'powerpoint', label: 'PowerPoint' },
  { key: 'outlook', label: 'Outlook' },
];

export const CopilotTab: React.FC<CopilotTabProps> = ({
  users,
  trend,
  departments,
  managers,
  selectedDept,
  onSelectDept,
  selectedManager,
  onSelectManager,
  timeGrain = 'MONTHLY',
  periodKey = '2026-10',
}) => {
  const [breakdownMode, setBreakdownMode] = useState<'department' | 'evp'>('department');

  const copilotUsers = users.filter((u) => u.copilot && u.copilot.licensed);
  // KPI cards are calculated from the live PostgreSQL-backed Copilot endpoint.
  // If the request fails, show zero values rather than silently using dummy records.
  const [apiKpis, setApiKpis] = useState<PlatformKPIs | null>(null);
  useEffect(() => {
    let cancelled = false;
    ApiService.getCopilotDatabaseKpis(timeGrain, periodKey)
      .then((data) => { if (!cancelled) setApiKpis(data); })
      .catch(() => { if (!cancelled) setApiKpis(null); });
    return () => { cancelled = true; };
  }, [timeGrain, periodKey]);
  const kpis = apiKpis ?? { licensedUsers: 0, activeUsers28d: 0, weeklyActiveUsers: 0, utilizationRate: 0, idleUsersCount: 0, neverUsedCount: 0, totalMonthlySpend: 0, avgSpendPerActiveUser: 0, totalVolume: 0, avgVolumePerActive: 0, purchasedSeats: 0 };

  // Dynamic period calculations
  const isWeekly = timeGrain === 'WEEKLY';
  const periodSuffix = isWeekly ? '7d' : '28d';
  const licensesAssigned = kpis.licensedUsers;
  const activeUsers = isWeekly ? kpis.weeklyActiveUsers : kpis.activeUsers28d;
  const idleUsers = Math.max(0, licensesAssigned - activeUsers);
  const prompts = kpis.totalVolume;
  const utilizationRate = licensesAssigned > 0 ? Math.round((activeUsers / licensesAssigned) * 100) : 0;
  const idleRate = licensesAssigned > 0 ? Math.round((idleUsers / licensesAssigned) * 100) : 0;

  // Department stacked bars: only departments with at least one licensed Copilot user
  const deptBars = departments.filter((d) => d.copilotLicenses > 0).map((d) => ({
    name: d.name,
    active: d.copilotActive,
    idle: d.copilotLicenses - d.copilotActive,
    total: d.copilotLicenses,
    pct: d.copilotLicenses > 0 ? (d.copilotActive / d.copilotLicenses) * 100 : 0,
    cost: d.copilotSpend,
  }));

  // EVP stacked bars (Executive leadership grouping): only EVPs with at least one licensed Copilot user
  // `managers` is grouped by manager_level_3_user_id; id keeps selection stable even if two EVPs share a name
  const evpBars = managers.filter((m) => m.copilotLicensed > 0).map((m) => ({
    id: m.managerId,
    name: m.managerName,
    active: m.copilotActive,
    idle: m.copilotLicensed - m.copilotActive,
    total: m.copilotLicensed,
    pct: m.copilotLicensed > 0 ? (m.copilotActive / m.copilotLicensed) * 100 : 0,
    cost: m.copilotSpend,
  }));

  // Segments donut: counts and seat spend come from the users in each segment
  const segmentUsers = (name: 'Power' | 'Regular' | 'Light' | 'Never used') =>
    copilotUsers.filter((u) => u.copilot?.segment === name);
  const segmentStats = (name: 'Power' | 'Regular' | 'Light' | 'Never used') => {
    const list = segmentUsers(name);
    return { count: list.length, cost: list.reduce((sum, u) => sum + (u.copilot?.seatCost || 0), 0) };
  };
  const windowLabel = isWeekly ? '7 days' : '28 days';

  const segmentDonutData = [
    {
      name: 'Power (4+ apps)',
      ...segmentStats('Power'),
      color: '#2563eb',
      definition: `Active in 4+ M365 apps or 200+ prompts in the period`,
    },
    {
      name: 'Regular (2–3 apps)',
      ...segmentStats('Regular'),
      color: '#60a5fa',
      definition: 'Active in 2–3 apps or 30–199 prompts in the period',
    },
    {
      name: 'Light (1 app)',
      ...segmentStats('Light'),
      color: '#93c5fd',
      definition: 'Active in 1 app or 1–29 prompts in the period',
    },
    {
      name: 'Never used (0 activity)',
      ...segmentStats('Never used'),
      color: '#cbd5e1',
      definition: 'Licensed, but no prompts or app activity in the period',
    },
  ];

  // App heatmap percentages by department: only departments with at least one licensed Copilot user
  const heatmapData = departments.flatMap((d) => {
    const deptUsers = copilotUsers.filter((u) => u.employee.department === d.name);
    if (deptUsers.length === 0) return [];
    const total = deptUsers.length;

    const calcAppPct = (appKey: 'chat' | 'teams' | 'word' | 'excel' | 'powerpoint' | 'outlook') => {
      const count = deptUsers.filter((u) => {
        const apps = u.copilot?.apps as (Record<string, boolean> | undefined);
        return apps?.[appKey] === true;
      }).length;
      return Math.round((count / total) * 100);
    };

    return [{
      department: d.name,
      chat: calcAppPct('chat'),
      teams: calcAppPct('teams'),
      word: calcAppPct('word'),
      excel: calcAppPct('excel'),
      powerpoint: calcAppPct('powerpoint'),
      outlook: calcAppPct('outlook'),
    }];
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-sky-900 text-white rounded-2xl p-6 shadow-md border border-sky-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Copilot Analytics</h2>
          <p className="text-xs text-sky-200 mt-1 font-medium">Microsoft 365 Copilot usage, adoption velocity, and seat utilization</p>
        </div>

        <div className="bg-white/10 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs text-right">
          <div className="text-[11px] text-sky-200 uppercase font-semibold">Platform Spend</div>
          <div className="text-2xl font-mono font-bold text-white">{formatUSD(kpis.totalMonthlySpend)}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Licenses Assigned"
          value={formatNumber(licensesAssigned)}
          subtext={`${formatUSD(kpis.totalMonthlySpend)}/mo`}
          badge={{ text: 'Provisioned', variant: 'slate' }}
          icon={Users}
        />

        <MetricCard
          label={`Active Users (${periodSuffix})`}
          value={formatNumber(activeUsers)}
          subtext={`${utilizationRate}% utilization · ${idleUsers} idle`}
          badge={{ text: `${utilizationRate}%`, variant: 'emerald' }}
          icon={Activity}
        />

        <MetricCard
          label={`Idle Users (${periodSuffix})`}
          value={formatNumber(idleUsers)}
          subtext={`${idleRate}% inactive seats`}
          badge={{ text: 'Idle', variant: 'amber' }}
          icon={Users}
        />

        <MetricCard
          label={`Prompts (${periodSuffix})`}
          value={formatNumber(prompts)}
          subtext="Work prompts & web searches"
          badge={{ text: 'Queries', variant: 'slate' }}
          icon={MessageSquare}
        />
      </div>

      {/* Row 1: Trend and Department / EVP Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Copilot Active Users Trend</h3>
              <p className="text-xs text-slate-500">Active vs licensed users at the end of each period</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
              {isWeekly ? 'Weekly Trend' : 'Monthly Trend'}
            </span>
          </div>

          <TrendLineChart
            data={trend}
            series={[
              { key: 'copilotActive', name: 'Active Users', color: '#0284c7', strokeWidth: 2.5 },
              { key: 'copilotLicensed', name: 'Licensed Seats', color: '#f59e0b', strokeWidth: 1.5, dashed: true },
            ]}
            height={250}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Active Users {breakdownMode === 'department' ? 'by Department' : "by EVP's"}
              </h3>
              <p className="text-xs text-slate-500">
                {breakdownMode === 'department' 
                  ? 'Active users out of licensed seats in each department'
                  : 'Direct organization AI adoption grouped by Executive Vice President (EVP)'}
              </p>
            </div>

            {/* Toggle between Department and EVP'S */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-medium border border-slate-200">
              <button
                onClick={() => setBreakdownMode('department')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  breakdownMode === 'department' ? 'bg-white text-sky-700 font-semibold shadow-2xs' : 'text-slate-600'
                }`}
              >
                Department
              </button>
              <button
                onClick={() => setBreakdownMode('evp')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  breakdownMode === 'evp' ? 'bg-white text-sky-700 font-semibold shadow-2xs' : 'text-slate-600'
                }`}
              >
                EVP's
              </button>
            </div>
          </div>

          <StackedHorizontalBarChart
            data={breakdownMode === 'department' ? deptBars : evpBars}
            activeColor="#0284c7"
            idleColor="#e2e8f0"
            activeLabel="Active"
            idleLabel="Licensed, Not Active"
            onSelect={(name) => {
              if (breakdownMode === 'department') {
                onSelectDept(name as DepartmentName);
              } else {
                onSelectManager(name);
              }
            }}
            selectedName={breakdownMode === 'department' 
              ? (selectedDept !== 'ALL' ? selectedDept : null)
              : (selectedManager !== 'ALL' ? selectedManager : null)
            }
          />
        </div>
      </div>

      {/* Row 2: Heatmap and User Segments */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Heatmap */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900 text-sm">Department by Application Heatmap</h3>
            <p className="text-xs text-slate-500">Share of licensed users active in each application over the last {windowLabel}</p>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-80">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2 px-3">Department</th>
                  {APPS.map((a) => (
                    <th key={a.key} className="py-2 px-2 text-center">{a.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {heatmapData.map((row) => (
                  <tr key={row.department} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{row.department}</td>
                    {APPS.map((a) => {
                      const val = (row as any)[a.key] || 0;
                      const opacity = 0.08 + (val / 100) * 0.85;
                      const textColor = val > 45 ? '#ffffff' : '#1e293b';
                      return (
                        <td
                          key={a.key}
                          className="py-2 px-2 text-center font-mono font-medium rounded-xs"
                          style={{
                            backgroundColor: `rgba(2, 132, 199, ${opacity})`,
                            color: textColor,
                          }}
                        >
                          {val}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Segments Donut with short definitions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Copilot User Segments</h3>
              <p className="text-xs text-slate-500">
                Multi-app adoption depth and prompt intensity categories
              </p>
            </div>

            <DonutChart
              segments={segmentDonutData}
              totalLabel="Copilot Licenses"
              size={170}
            />
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            <strong className="text-slate-700">App Depth:</strong> Power users actively leverage Copilot across 4 or more Office applications weekly.
          </div>
        </div>
      </div>
    </div>
  );
};