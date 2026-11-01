import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Coins,
  DollarSign,
  Layers3,
  Users,
  Zap,
} from "lucide-react";
import { ApiService } from "../../services/api";
import type { ClaudeReportAnalytics } from "../../services/api";
import { MetricCard } from "../common/MetricCard";
import { TrendLineChart } from "../common/Charts";

interface ClaudeTabProps {
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
  "#ea580c",
  "#d97706",
  "#7c3aed",
  "#0f766e",
  "#2563eb",
  "#db2777",
  "#64748b",
];

export const ClaudeTab: React.FC<ClaudeTabProps> = ({ periodKey }) => {
  const [report, setReport] = useState<ClaudeReportAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<"department" | "evp">("department");

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    ApiService.getClaudeReportAnalytics(periodKey)
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
              : "Unable to load cloud usage and cost reports.",
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

  const tokenMix = useMemo(() => {
    if (!kpis) return [];

    return [
      {
        label: "Input",
        value: kpis.inputTokens,
        color: "#ea580c",
      },
      {
        label: "Output",
        value: kpis.outputTokens,
        color: "#7c3aed",
      },
      {
        label: "Cache read",
        value: kpis.cacheReadTokens,
        color: "#059669",
      },
      {
        label: "Cache creation",
        value: kpis.cacheCreationTokens,
        color: "#0284c7",
      },
    ];
  }, [kpis]);

  const totalTokenMix = tokenMix.reduce(
    (sum, part) => sum + part.value,
    0,
  );

  // Cost rows for the selected grouping: department, or EVP (manager_level_3_user_id)
  const costRows = useMemo(() => {
    if (!report) return [];
    if (costBreakdown === "evp") {
      return (report.evps ?? []).map((e) => ({
        key: e.evpId,
        label: e.evpName,
        costUsd: e.costUsd,
      }));
    }
    return report.departments.map((d) => ({
      key: d.department,
      label: d.department,
      costUsd: d.costUsd,
    }));
  }, [report, costBreakdown]);

  const maxDepartmentCost = Math.max(
    1,
    ...costRows.map((row) => row.costUsd),
  );

  if (loading && !report) {
    return (
      <div
        className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600"
        role="status"
      >
        Loading Anthropic usage and cost reports for {periodKey}…
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
          Cloud analytics could not be loaded
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
          No cloud report data for {periodKey}
        </div>
        <p className="mt-1 text-sm">
          The usage and cost report tables returned no records for this period.
          No demo metrics are shown.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Platform Spend */}
      <section className="relative overflow-hidden rounded-2xl border border-orange-900 bg-gradient-to-r from-orange-950 via-stone-900 to-amber-950 p-6 text-white shadow-md">
        <div className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full border-[28px] border-white/5" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold tracking-tight">
            Anthropic Claude
          </h2>

          <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-right shadow-sm backdrop-blur-sm md:min-w-[154px]">
            <div className="text-xs font-bold uppercase tracking-wide text-orange-100">
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
        aria-label="Cloud usage KPIs"
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
          label="Cache Read Tokens"
          value={fmtCompact(kpis.cacheReadTokens)}
          subtext={
            kpis.totalTokens
              ? `${(
                  (kpis.cacheReadTokens / kpis.totalTokens) *
                  100
                ).toFixed(1)}% of reported tokens`
              : "No cache read tokens"
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
                Models are discovered from the selected period&apos;s usage and
                cost reports.
              </p>
            </div>

            <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800">
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
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Calculated Cost by {costBreakdown === "department" ? "Department" : "EVP"}
              </h3>
              <p className="text-xs text-slate-500">
                {costBreakdown === "department"
                  ? "Reported Claude cost matched to employee department"
                  : "Reported Claude cost grouped by Executive Vice President (EVP)"}
              </p>
            </div>

            {/* Toggle between Department and EVP's */}
            <div className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
              {(["department", "evp"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCostBreakdown(mode)}
                  className={`cursor-pointer rounded px-2.5 py-1 ${
                    costBreakdown === mode
                      ? "bg-white font-semibold text-orange-700 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
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
                      className="h-full rounded-full bg-orange-600"
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
                Claude Cost Trend
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
                color: "#ea580c",
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
              Input, output, cache-read and cache-creation volume from the usage
              report.
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

      {/* Highest-cost reporting users */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Highest-cost reporting users
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              User-level totals aggregated across models from the two reports.
            </p>
          </div>

          <span className="text-xs text-slate-500">
            Showing up to 8 users
          </span>
        </div>

        {report.users.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No user usage rows for this period.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {report.users.slice(0, 8).map((user, index) => (
              <div
                key={user.userId || user.email || user.displayName}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div
                      className="truncate text-sm font-semibold text-slate-800"
                      title={user.displayName}
                    >
                      {user.displayName}
                    </div>

                    <div
                      className="truncate text-xs text-slate-500"
                      title={user.email || ""}
                    >
                      {user.email || user.userId || "No user identifier"}
                    </div>
                  </div>

                  <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-slate-500">
                    #{index + 1}
                  </span>
                </div>

                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">
                      Reported cost
                    </div>
                    <div className="font-mono text-lg font-bold text-slate-900">
                      {fmtMoney(user.costUsd)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">
                      Tokens
                    </div>
                    <div className="font-mono text-sm font-semibold text-slate-700">
                      {fmtCompact(user.totalTokens)}
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                  <span>{fmtNumber(user.requests)} requests</span>
                  <span>{user.models.length} models</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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