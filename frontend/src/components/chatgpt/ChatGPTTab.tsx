import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bot,
  ChevronLeft,
  ChevronRight,
  Coins,
  DollarSign,
  ExternalLink,
  Filter,
  Layers3,
  Search,
  Sparkles,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { ChatGPTReportAnalytics, ChatGPTReportUser } from "../../services/api";
import { ApiService } from "../../services/api";
import { MetricCard } from "../common/MetricCard";
import { TrendLineChart } from "../common/Charts";

interface ChatGPTTabProps {
  periodKey: string;
}

const numberFmt = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const moneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compactFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const fmtNumber = (value: number) =>
  numberFmt.format(Number.isFinite(value) ? value : 0);

const fmtMoney = (value: number) =>
  moneyFmt.format(Number.isFinite(value) ? value : 0);

const fmtCompact = (value: number) =>
  compactFmt.format(Number.isFinite(value) ? value : 0);

const modelColors = [
  "#10a37f",
  "#059669",
  "#0f766e",
  "#0284c7",
  "#2563eb",
  "#7c3aed",
  "#64748b",
];


const getUserSegment = (user: ChatGPTReportUser): 'Power' | 'Regular' | 'Light' => {
  if (user.costUsd >= 8 || user.totalTokens >= 5000000) return 'Power';
  if (user.costUsd >= 2 || user.totalTokens >= 1000000) return 'Regular';
  return 'Light';
};

/** Department/title come from the shared user record when available. */
const metaFor = (user: ChatGPTReportUser) => ({
  dept: user.department || "Unassigned",
  title: user.title || "User",
});


export const ChatGPTTab: React.FC<ChatGPTTabProps> = ({ periodKey }) => {
  const [report, setReport] = useState<ChatGPTReportAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<"department" | "evp">("department");

  // Table State
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<"all" | "power" | "regular" | "light">("all");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<"costUsd" | "totalTokens" | "requests" | "displayName">("costUsd");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserModal, setSelectedUserModal] = useState<ChatGPTReportUser | null>(null);

  const pageSize = 10;

  // Demo mode: ApiService serves src/data/demoData.json.
  // Live mode (VITE_USE_DUMMY_DATA=false): reads /api/chatgpt/analytics from PostgreSQL.
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    ApiService.getChatGPTReportAnalytics(periodKey)
      .then((data) => {
        if (!cancelled) {
          setReport(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setReport(null);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load ChatGPT usage and cost reports.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [periodKey]);

  const kpis = report?.kpis;

  const modelMaxCost = Math.max(
    1,
    ...(report?.models.map((model) => model.costUsd) ?? [0]),
  );

  const modelMaxTokens = Math.max(
    1,
    ...(report?.models.map((model) => model.totalTokens) ?? [0]),
  );

  const costRows = useMemo(() => {
    if (!report) return [];
    if (costBreakdown === "evp") {
      return (report.evps ?? []).map((e) => ({ key: e.evpId, label: e.evpName, costUsd: e.costUsd }));
    }
    return report.departments.map((d) => ({ key: d.department, label: d.department, costUsd: d.costUsd }));
  }, [report, costBreakdown]);
  const maxDepartmentCost = Math.max(1, ...costRows.map((row) => row.costUsd));

  const tokenMix = useMemo(() => {
    if (!kpis) return [];

    return [
      {
        label: "Input",
        value: kpis.inputTokens,
        color: "#10a37f",
      },
      {
        label: "Output",
        value: kpis.outputTokens,
        color: "#0f766e",
      },
      {
        label: "Cached",
        value: kpis.cachedTokens,
        color: "#0284c7",
      },
    ];
  }, [kpis]);

  const totalTokenMix = tokenMix.reduce(
    (sum, part) => sum + part.value,
    0,
  );

  // Departments list derived from users or report
  const allDepartments = useMemo(() => {
    if (!report?.users) return [];
    const depts = new Set<string>();
    report.users.forEach((u) => {
      const meta = metaFor(u);
      if (meta.dept) depts.add(meta.dept);
    });
    return Array.from(depts).sort();
  }, [report?.users]);

  // Models list
  const allModelsList = useMemo(() => {
    if (!report?.models) return [];
    return report.models.map((m) => m.model);
  }, [report?.models]);

  // Filtered and Sorted Users
  const filteredUsers = useMemo(() => {
    if (!report?.users) return [];

    return report.users.filter((user) => {
      const emailLower = (user.email || "").toLowerCase();
      const meta = metaFor(user);

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = user.displayName.toLowerCase().includes(q);
        const matchesEmail = emailLower.includes(q);
        const matchesDept = meta.dept.toLowerCase().includes(q);
        const matchesTitle = meta.title.toLowerCase().includes(q);
        const matchesId = (user.userId || "").toLowerCase().includes(q);

        if (!matchesName && !matchesEmail && !matchesDept && !matchesTitle && !matchesId) {
          return false;
        }
      }

      // Segment Filter
      const seg = getUserSegment(user);
      if (segmentFilter === "power" && seg !== "Power") return false;
      if (segmentFilter === "regular" && seg !== "Regular") return false;
      if (segmentFilter === "light" && seg !== "Light") return false;

      // Department Filter
      if (selectedDept !== "ALL" && meta.dept !== selectedDept) {
        return false;
      }

      // Model Filter
      if (selectedModelFilter !== "ALL" && !user.models.includes(selectedModelFilter)) {
        return false;
      }

      return true;
    });
  }, [report?.users, search, segmentFilter, selectedDept, selectedModelFilter]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "displayName") {
        valA = (a.displayName || "").toLowerCase();
        valB = (b.displayName || "").toLowerCase();
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortField, sortDir]);

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, currentPage, pageSize]);

  const handleSort = (field: "costUsd" | "totalTokens" | "requests" | "displayName") => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  if (loading && !report) {
    return (
      <div
        className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600"
        role="status"
      >
        Loading OpenAI ChatGPT usage and cost reports for {periodKey}…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900"
        role="alert"
      >
        <div className="font-semibold">
          ChatGPT analytics could not be loaded
        </div>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  if (
    !report ||
    !kpis ||
    (kpis.activeUsers === 0 &&
      kpis.totalTokens === 0 &&
      kpis.reportedCostUsd === 0)
  ) {
    return (
      <div
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900"
        role="status"
      >
        <div className="font-semibold">
          No ChatGPT report data for {periodKey}
        </div>
        <p className="mt-1 text-sm">
          The usage and cost report tables returned no records for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Platform Spend */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-900 bg-gradient-to-r from-emerald-950 via-stone-900 to-teal-950 p-6 text-white shadow-md">
        <div className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full border-[28px] border-white/5" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 backdrop-blur-sm">
              <Sparkles size={13} />
              OpenAI Enterprise Telemetry
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              OpenAI ChatGPT
            </h2>
            <p className="mt-1 text-xs text-emerald-200/80">
              Enterprise usage analytics, model composition, and active user insights
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-right shadow-sm backdrop-blur-sm md:min-w-[154px]">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-100">
              Platform Spend
            </div>
            <div className="mt-1 font-mono text-3xl font-extrabold tracking-tight text-white">
              {fmtMoney(kpis.reportedCostUsd)}
            </div>
          </div>
        </div>
      </section>

      {/* KPI cards */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="ChatGPT usage KPIs"
      >
        <MetricCard
          label="Reporting Users"
          value={fmtNumber(kpis.activeUsers)}
          subtext="Distinct users in usage report"
          badge={{ text: "Reported", variant: "indigo" }}
          icon={Users}
        />

        <MetricCard
          label="Total Tokens"
          value={fmtCompact(kpis.totalTokens)}
          subtext={`${fmtNumber(kpis.inputTokens)} input · ${fmtNumber(kpis.outputTokens)} output`}
          badge={{ text: "Usage report", variant: "indigo" }}
          icon={Coins}
        />

        <MetricCard
          label="Requests"
          value={fmtCompact(kpis.requests)}
          subtext="Sum of reported requests"
          badge={{ text: "Reported", variant: "slate" }}
          icon={Activity}
        />

        <MetricCard
          label="Cached Tokens"
          value={fmtCompact(kpis.cachedTokens)}
          subtext={
            kpis.totalTokens
              ? `${(
                  (kpis.cachedTokens / kpis.totalTokens) *
                  100
                ).toFixed(1)}% of reported tokens`
              : "No cached tokens"
          }
          badge={{ text: "Usage report", variant: "emerald" }}
          icon={Zap}
        />
      </section>

      {/* Model usage and token composition */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Model usage and reported cost
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Models discovered from the selected period&apos;s usage and cost reports.
              </p>
            </div>

            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              {report.models.length} models
            </span>
          </div>

          {report.models.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              No model-level report rows for this period.
            </p>
          ) : (
            <div className="space-y-4">
              {report.models.map((model, index) => (
                <div key={model.model} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            modelColors[index % modelColors.length],
                        }}
                      />

                      <span className="truncate font-semibold text-slate-800">
                        {model.model}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900">
                        {fmtMoney(model.costUsd)}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        {fmtCompact(model.totalTokens)} tokens
                      </span>
                    </div>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(
                          model.costUsd > 0 ? 1 : 0,
                          (model.costUsd / modelMaxCost) * 100,
                        )}%`,
                        backgroundColor:
                          modelColors[index % modelColors.length],
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{fmtNumber(model.requests)} requests</span>
                    <span>
                      {model.totalTokens
                        ? `${(
                            (model.totalTokens / modelMaxTokens) *
                            100
                          ).toFixed(1)}% of largest model token volume`
                        : "No token volume reported"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Calculated Cost by {costBreakdown === "department" ? "Department" : "EVP"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {costBreakdown === "department" ? "Reported ChatGPT cost matched to employee department" : "Reported ChatGPT cost grouped by Workday EVP hierarchy"}
              </p>
            </div>
            <div className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
              {(["department", "evp"] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => setCostBreakdown(mode)} className={`cursor-pointer rounded px-2.5 py-1 ${costBreakdown === mode ? "bg-white font-semibold text-emerald-700 shadow-sm" : "text-slate-600"}`}>
                  {mode === "department" ? "Department" : "EVP's"}
                </button>
              ))}
            </div>
          </div>

          {costRows.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              No {costBreakdown === "department" ? "department" : "EVP"} cost data available.
            </div>
          ) : (
            <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
              {costRows.map((item) => (
                <div key={item.key}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-slate-700">
                      {item.label}
                    </span>

                    <span className="font-mono font-semibold text-slate-900">
                      {fmtMoney(item.costUsd)}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{
                        width: `${Math.max(
                          item.costUsd > 0 ? 1 : 0,
                          (item.costUsd / maxDepartmentCost) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Third row: Cost trend and token composition */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                ChatGPT Cost Trend
              </h3>
              <p className="text-xs text-slate-500">
                Daily reported API cost for the selected period
              </p>
            </div>

            <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              Daily Trend
            </span>
          </div>

          <TrendLineChart
            data={report.trend.map((point) => ({
              label: point.label.slice(5),
              date: point.date,
              costUsd: point.costUsd,
            }))}
            series={[
              {
                key: "costUsd",
                name: "Reported Cost (USD)",
                color: "#10a37f",
                strokeWidth: 2.5,
              },
            ]}
            height={250}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Token composition
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Input, output, and cached volume from the usage report.
            </p>
          </div>

          <div
            className="mb-5 flex h-4 overflow-hidden rounded-full bg-slate-100"
            aria-label="Token composition bar"
          >
            {tokenMix.map((part) => (
              <div
                key={part.label}
                title={`${part.label}: ${fmtNumber(part.value)}`}
                style={{
                  width: `${
                    totalTokenMix
                      ? (part.value / totalTokenMix) * 100
                      : 0
                  }%`,
                  backgroundColor: part.color,
                }}
              />
            ))}
          </div>

          <div className="space-y-4">
            {tokenMix.map((part) => (
              <div
                key={part.label}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: part.color }}
                  />
                  {part.label}
                </div>

                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-slate-900">
                    {fmtCompact(part.value)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {totalTokenMix
                      ? `${(
                          (part.value / totalTokenMix) *
                          100
                        ).toFixed(1)}%`
                      : "0%"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Layers3 size={14} />
              Total report volume
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900">
              {fmtNumber(kpis.totalTokens)}{" "}
              <span className="text-xs font-normal text-slate-500">
                tokens
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* OpenAI ChatGPT User Details Table */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                OpenAI ChatGPT User Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Reporting ChatGPT users and their model-specific activity for the selected period.
              </p>
            </div>

            {/* Quick Segment Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-lg self-start md:self-auto">
              <button
                onClick={() => { setSegmentFilter("all"); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  segmentFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Users ({report.users.length})
              </button>
              <button
                onClick={() => { setSegmentFilter("power"); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  segmentFilter === "power"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Power Users
              </button>
              <button
                onClick={() => { setSegmentFilter("regular"); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  segmentFilter === "regular"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Regular
              </button>
              <button
                onClick={() => { setSegmentFilter("light"); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  segmentFilter === "light"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Light
              </button>
            </div>
          </div>

          {/* Search Bar & Dropdown Controls */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user, email, dept..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Department Filter */}
            {allDepartments.length > 0 && (
              <select
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
                className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Departments</option>
                {allDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            )}

            {/* Model Filter */}
            {allModelsList.length > 0 && (
              <select
                value={selectedModelFilter}
                onChange={(e) => { setSelectedModelFilter(e.target.value); setCurrentPage(1); }}
                className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Models</option>
                {allModelsList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Users Table */}
        {sortedUsers.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No matching ChatGPT users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("displayName")}
                  >
                    <div className="flex items-center gap-1">
                      User
                      {sortField === "displayName" ? (
                        sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Models Used</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 text-right"
                    onClick={() => handleSort("requests")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Requests
                      {sortField === "requests" ? (
                        sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 text-right"
                    onClick={() => handleSort("totalTokens")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Total Tokens
                      {sortField === "totalTokens" ? (
                        sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 text-right"
                    onClick={() => handleSort("costUsd")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Token Cost
                      {sortField === "costUsd" ? (
                        sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.map((user) => {
                  const meta = metaFor(user);
                  const segment = getUserSegment(user);

                  return (
                    <tr
                      key={user.userId || user.email || user.displayName}
                      onClick={() => setSelectedUserModal(user)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {user.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {user.displayName}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {user.email || user.userId}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 mb-0.5">
                            {meta.dept}
                          </span>
                          <div className="text-[11px] text-slate-500 truncate">
                            {meta.title}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {user.models.map((m) => (
                            <span
                              key={m}
                              className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 border border-emerald-200 text-emerald-800"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                        {fmtNumber(user.requests)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-semibold text-slate-900">
                          {fmtCompact(user.totalTokens)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {fmtCompact(user.inputTokens)} in · {fmtCompact(user.outputTokens)} out
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-emerald-700">
                          {fmtMoney(user.costUsd)}
                        </div>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            segment === "Power"
                              ? "bg-purple-100 text-purple-800"
                              : segment === "Regular"
                              ? "bg-teal-100 text-teal-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {segment}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                        {user.lastActivity || "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {sortedUsers.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
            <div>
              Showing {Math.min((currentPage - 1) * pageSize + 1, sortedUsers.length)} to{" "}
              {Math.min(currentPage * pageSize, sortedUsers.length)} of {sortedUsers.length} users
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* User Detail Modal */}
      {selectedUserModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setSelectedUserModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  {selectedUserModal.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedUserModal.displayName}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedUserModal.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Total Cost</div>
                  <div className="font-mono text-xl font-extrabold text-emerald-700 mt-0.5">
                    {fmtMoney(selectedUserModal.costUsd)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Total Volume</div>
                  <div className="font-mono text-xl font-bold text-slate-900 mt-0.5">
                    {fmtCompact(selectedUserModal.totalTokens)} tokens
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-800">Token Breakdown</div>
                <div className="space-y-1.5 font-mono text-slate-600">
                  <div className="flex justify-between">
                    <span>Input Tokens:</span>
                    <span>{fmtNumber(selectedUserModal.inputTokens)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Output Tokens:</span>
                    <span>{fmtNumber(selectedUserModal.outputTokens)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cached Tokens:</span>
                    <span>{fmtNumber(selectedUserModal.cachedTokens)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1 font-bold text-slate-900">
                    <span>Requests Count:</span>
                    <span>{fmtNumber(selectedUserModal.requests)}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="font-semibold text-slate-800 mb-1.5">Models Used</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedUserModal.models.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-1 text-xs font-semibold rounded bg-emerald-50 border border-emerald-200 text-emerald-800"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedUserModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data source footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500">
        <span>
          Data source: {report.source.usage} + {report.source.cost}
        </span>

        <span>
          Seat/license charges are excluded; this view shows reported API
          consumption cost only.
        </span>
      </div>
    </div>
  );
};
