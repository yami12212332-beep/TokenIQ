import React, { useState, useMemo, useEffect } from "react";
import { TIME_PERIOD_OPTIONS } from "./config/periods";
import { ApiService } from "./services/api";
import type { UnifiedUser, TrendDataPoint } from "./types/dashboard";
import { DepartmentName, TimeGrain } from "./types/dashboard";
import type { OverallChatGPTRow } from "./utils/overall";
import {
  applyDerivedMetrics,
  calculateDepartmentSummaries,
  calculateEvpSummaries,
  getEvpKey,
} from "./utils/analytics";
import { Header } from "./components/Header";
import type { TabId } from "./components/Header";
import { CopilotTab } from "./components/copilot/CopilotTab";
import { ClaudeTab } from "./components/claude/ClaudeTab";
import { OverallTab } from "./components/overall/OverallTab";
import { ChatGPTTab } from "./components/chatgpt/ChatGPTTab";
import { UserTable } from "./components/users/UserTable";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("overall");
  // Tabs that render from the shared /dashboard/users payload
  const usesSharedData = activeTab === "overall" || activeTab === "copilot";
  const [selectedDept, setSelectedDept] = useState<DepartmentName | "ALL">(
    "ALL",
  );
  const [selectedManager, setSelectedManager] = useState<string | "ALL">("ALL");

  // Time grain & period state
  const [timeGrain, setTimeGrain] = useState<TimeGrain>("MONTHLY");
  const [periodKey, setPeriodKey] = useState<string>("2026-10");

  // All displayed user metrics originate from the backend's PostgreSQL-backed endpoint.
  const [rawUsers, setRawUsers] = useState<UnifiedUser[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [chatgptUsersMap, setChatgptUsersMap] = useState<Map<string, OverallChatGPTRow>>(new Map());
  // Separate live data for Copilot. Other tabs continue using deterministic dummy data.
  const [copilotRawUsers, setCopilotRawUsers] = useState<UnifiedUser[]>([]);
  const [copilotTrendData, setCopilotTrendData] = useState<TrendDataPoint[]>([]);
  const [copilotDataError, setCopilotDataError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Fetch ChatGPT user metrics map for complete Excel exports
  useEffect(() => {
    let cancelled = false;
    ApiService.getOverallChatGPTUsers(timeGrain, periodKey)
      .then((res) => {
        if (!cancelled && res.rows) {
          const map = new Map<string, OverallChatGPTRow>();
          res.rows.forEach((r) => {
            if (r.email) map.set(r.email.toLowerCase(), r);
          });
          setChatgptUsersMap(map);
        }
      })
      .catch(() => {
        if (!cancelled) setChatgptUsersMap(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [timeGrain, periodKey]);

  useEffect(() => {
    let cancelled = false;
    setDataLoading(true);
    setDataError(null);
    Promise.all([
      ApiService.getDashboardUsers(timeGrain, periodKey),
      ApiService.getDashboardTrends(timeGrain, periodKey),
    ])
      .then(([usersResponse, trendsResponse]) => {
        if (!cancelled) {
          setRawUsers(usersResponse.users.map(applyDerivedMetrics));
          setTrendData(trendsResponse.rows);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setRawUsers([]);
          setTrendData([]);
          setDataError(
            error instanceof Error
              ? error.message
              : "Failed to load dashboard data from backend",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [timeGrain, periodKey]);

  useEffect(() => {
    let cancelled = false;
    setCopilotDataError(null);
    Promise.all([
      ApiService.getCopilotDatabaseUsers(timeGrain, periodKey),
      ApiService.getCopilotDatabaseTrends(timeGrain, periodKey),
    ])
      .then(([usersResponse, trendsResponse]) => {
        if (!cancelled) {
          setCopilotRawUsers(usersResponse.users.map(applyDerivedMetrics));
          setCopilotTrendData(trendsResponse.rows);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCopilotRawUsers([]);
          setCopilotTrendData([]);
          setCopilotDataError(error instanceof Error ? error.message : "Failed to load Copilot data from database");
        }
      });
    return () => { cancelled = true; };
  }, [timeGrain, periodKey]);

  // Current period display label
  const activePeriodObj = useMemo(() => {
    return (
      TIME_PERIOD_OPTIONS.find((p) => p.key === periodKey) ||
      TIME_PERIOD_OPTIONS[0]
    );
  }, [periodKey]);

  // Filter users by department and EVP selection from chart clicks
  const filteredUsers = useMemo(() => {
    return rawUsers.filter((u) => {
      if (selectedDept !== "ALL" && u.employee.department !== selectedDept)
        return false;
      if (
        selectedManager !== "ALL" &&
        getEvpKey(u) !== selectedManager
      )
        return false;
      return true;
    });
  }, [rawUsers, selectedDept, selectedManager]);

  // Aggregate department summaries
  const departmentSummaries = useMemo(() => {
    return calculateDepartmentSummaries(rawUsers);
  }, [rawUsers]);

  // Aggregate EVP summaries (grouped by Workday manager_level_3_user_id)
  const managerSummaries = useMemo(() => {
    return calculateEvpSummaries(rawUsers);
  }, [rawUsers]);

  const filteredCopilotUsers = useMemo(() => {
    return copilotRawUsers.filter((u) => {
      if (selectedDept !== "ALL" && u.employee.department !== selectedDept) return false;
      if (selectedManager !== "ALL" && getEvpKey(u) !== selectedManager) return false;
      return true;
    });
  }, [copilotRawUsers, selectedDept, selectedManager]);
  const copilotDepartmentSummaries = useMemo(
    () => calculateDepartmentSummaries(copilotRawUsers),
    [copilotRawUsers],
  );
  const copilotManagerSummaries = useMemo(
    () => calculateEvpSummaries(copilotRawUsers),
    [copilotRawUsers],
  );

  const handleSelectDept = (dept: DepartmentName) => {
    setSelectedDept((prev) => (prev === dept ? "ALL" : dept));
  };

  const handleSelectManager = (mgr: string) => {
    setSelectedManager((prev) => (prev === mgr ? "ALL" : mgr));
  };

  // Tab-Specific Excel Export utility (queries Python FastAPI backend or builds tab-tailored dataset)
  const handleExportExcel = async () => {
    const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
    try {
      const response = await fetch(
        `${API_ORIGIN}/api/dashboard/export-excel?period_type=${timeGrain}&period_key=${encodeURIComponent(periodKey)}&tab=${activeTab}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `TokenIQ_${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}_${periodKey}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // Fall through to client dataset builder if offline
    }

    const downloadExcelFile = (headers: string[], rows: (string | number)[][], filename: string) => {
      const csvData = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csvData], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    const currentTab = (activeTab || "overall").toLowerCase();

    // 1. COPILOT TAB EXPORT (Only Copilot-licensed users & Copilot columns)
    if (currentTab === "copilot") {
      const headers = [
        "Employee ID",
        "Name",
        "Email",
        "Department",
        "Business Function",
        "Title",
        "EVP / Manager",
        "Period",
        "Copilot Status",
        "Copilot Prompts Count",
        "Prompts Work",
        "Prompts Web",
        "Apps Used Count",
        "Active Days Count",
        "Monthly Seat Cost ($)",
      ];

      const targetUsers = filteredCopilotUsers.length > 0
        ? filteredCopilotUsers
        : copilotRawUsers.length > 0
          ? copilotRawUsers
          : rawUsers.filter((u) => u.copilot?.licensed);

      const rows = targetUsers.map((u) => {
        const cp = u.copilot;
        const name = u.employee.name || u.employee.email || "Unknown";
        const dept = u.employee.department || "Unassigned";
        const func = u.employee.businessFunction || "Unassigned";
        const title = u.employee.title || "";
        const mgr = u.employee.managerName || "Unassigned";
        return [
          u.employee.id || "",
          `"${name.replace(/"/g, '""')}"`,
          u.employee.email || "",
          `"${dept.replace(/"/g, '""')}"`,
          `"${func.replace(/"/g, '""')}"`,
          `"${title.replace(/"/g, '""')}"`,
          `"${mgr.replace(/"/g, '""')}"`,
          periodKey,
          cp?.status || "N/A",
          cp?.promptsTotal || 0,
          cp?.promptsWork || 0,
          cp?.promptsWeb || 0,
          cp?.appsUsedCount || 0,
          cp?.activeDaysCount || 0,
          cp?.seatCost || 0,
        ];
      });

      downloadExcelFile(headers, rows, `TokenIQ_Copilot_${periodKey}.xlsx`);
      return;
    }

    // 2. CLAUDE TAB EXPORT (Only Claude users & Claude columns)
    if (currentTab === "claude") {
      const headers = [
        "Employee ID",
        "Name",
        "Email",
        "Department",
        "Business Function",
        "Title",
        "EVP / Manager",
        "Period",
        "Claude Plan Tier",
        "Claude Status",
        "Requests Count",
        "Input Tokens",
        "Output Tokens",
        "Cache Read Tokens",
        "Cache Creation Tokens",
        "Total Tokens",
        "Token Cost ($)",
        "Total Monthly Cost ($)",
        "Favorite Model",
      ];

      const targetUsers = filteredUsers.filter((u) => u.claude?.licensed);

      const rows = targetUsers.map((u) => {
        const cl = u.claude;
        return [
          u.employee.id,
          `"${u.employee.name.replace(/"/g, '""')}"`,
          u.employee.email,
          `"${u.employee.department.replace(/"/g, '""')}"`,
          `"${u.employee.businessFunction.replace(/"/g, '""')}"`,
          `"${u.employee.title.replace(/"/g, '""')}"`,
          `"${(u.employee.managerName || "").replace(/"/g, '""')}"`,
          periodKey,
          cl?.licenseTier || "Enterprise",
          cl?.status || "Active",
          cl?.requestCount || 0,
          cl?.inputTokens || 0,
          cl?.outputTokens || 0,
          cl?.cacheReadTokens || 0,
          cl?.cacheCreationTokens || 0,
          cl?.totalTokens || 0,
          cl?.tokenCostUsd || 0,
          cl?.totalMonthlyCost || 0,
          `"${cl?.favoriteModel || "claude-3-5-sonnet"}"`,
        ];
      });

      downloadExcelFile(headers, rows, `TokenIQ_Claude_${periodKey}.xlsx`);
      return;
    }

    // 3. CHATGPT TAB EXPORT (Only ChatGPT active users & ChatGPT columns)
    if (currentTab === "chatgpt") {
      const headers = [
        "Employee ID",
        "Name",
        "Email",
        "Department",
        "Business Function",
        "Title",
        "EVP / Manager",
        "Period",
        "ChatGPT Active",
        "Requests Count",
        "Total Tokens",
        "Token Cost ($)",
      ];

      const targetUsers = filteredUsers.filter((u) => {
        const email = (u.employee.email || "").toLowerCase();
        return Boolean(u.chatgpt?.licensed || chatgptUsersMap.has(email));
      });

      const rows = targetUsers.map((u) => {
        const email = (u.employee.email || "").toLowerCase();
        const gpt = u.chatgpt || chatgptUsersMap.get(email);
        const reqCount = u.chatgpt?.requestCount ?? (gpt as any)?.requests ?? 0;
        const tokCount = u.chatgpt?.totalTokens ?? (gpt as any)?.tokens ?? 0;
        const costUsd = u.chatgpt?.tokenCostUsd ?? (gpt as any)?.tokenCostUsd ?? 0;
        return [
          u.employee.id,
          `"${u.employee.name.replace(/"/g, '""')}"`,
          u.employee.email,
          `"${u.employee.department.replace(/"/g, '""')}"`,
          `"${u.employee.businessFunction.replace(/"/g, '""')}"`,
          `"${u.employee.title.replace(/"/g, '""')}"`,
          `"${(u.employee.managerName || "").replace(/"/g, '""')}"`,
          periodKey,
          "Yes",
          reqCount,
          tokCount,
          costUsd,
        ];
      });

      downloadExcelFile(headers, rows, `TokenIQ_ChatGPT_${periodKey}.xlsx`);
      return;
    }

    // 4. OVERALL TAB EXPORT (All users & combined multi-platform columns)
    const headers = [
      "Employee ID",
      "Name",
      "Email",
      "Department",
      "Business Function",
      "Title",
      "EVP / Manager",
      "Period",
      "Active Platforms",
      "Copilot Licensed",
      "Copilot Status",
      "Copilot Prompts Count",
      "Copilot Monthly Cost ($)",
      "Claude Licensed",
      "Claude Plan Tier",
      "Claude Requests Count",
      "Claude Total Tokens",
      "Claude Token Cost ($)",
      "ChatGPT Active",
      "ChatGPT Requests Count",
      "ChatGPT Total Tokens",
      "ChatGPT Cost ($)",
      "Power Score",
      "Total Combined Spend USD ($)",
    ];

    const rows = filteredUsers.map((u) => {
      const email = (u.employee.email || "").toLowerCase();
      const gpt = chatgptUsersMap.get(email);

      const copilotLicensed = u.copilot?.licensed ? "Yes" : "No";
      const copilotStatus = u.copilot?.status || "N/A";
      const copilotPrompts = u.copilot?.promptsTotal || 0;
      const copilotCost = u.copilot?.seatCost || 0;

      const claudeLicensed = u.claude?.licensed ? "Yes" : "No";
      const claudeTier = u.claude?.licenseTier || "N/A";
      const claudeRequests = u.claude?.requestCount || 0;
      const claudeTokens = u.claude?.totalTokens || 0;
      const claudeCost = u.claude?.tokenCostUsd || u.claude?.totalMonthlyCost || 0;

      const chatgptActive = gpt ? "Yes" : "No";
      const chatgptRequests = gpt?.requests || 0;
      const chatgptTokens = gpt?.tokens || 0;
      const chatgptCost = gpt?.tokenCostUsd || 0;

      const totalSpend = (u.copilot?.seatCost || 0) + (u.claude?.totalMonthlyCost || 0) + (gpt?.tokenCostUsd || 0) || u.totalSpend;

      return [
        u.employee.id,
        `"${u.employee.name.replace(/"/g, '""')}"`,
        u.employee.email,
        `"${u.employee.department.replace(/"/g, '""')}"`,
        `"${u.employee.businessFunction.replace(/"/g, '""')}"`,
        `"${u.employee.title.replace(/"/g, '""')}"`,
        `"${(u.employee.managerName || "").replace(/"/g, '""')}"`,
        periodKey,
        `"${u.platforms}"`,
        copilotLicensed,
        copilotStatus,
        copilotPrompts,
        copilotCost,
        claudeLicensed,
        claudeTier,
        claudeRequests,
        claudeTokens,
        claudeCost,
        chatgptActive,
        chatgptRequests,
        chatgptTokens,
        chatgptCost,
        u.powerScore || 0,
        totalSpend,
      ];
    });

    downloadExcelFile(headers, rows, `TokenIQ_Overall_${periodKey}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-rose-100 selection:text-rose-900">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        timeGrain={timeGrain}
        setTimeGrain={setTimeGrain}
        periodKey={periodKey}
        setPeriodKey={setPeriodKey}
        availablePeriods={TIME_PERIOD_OPTIONS}
        onExportExcel={handleExportExcel}
        reportDate={activePeriodObj.label}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {dataLoading && usesSharedData && (
          <div
            role="status"
            className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600"
          >
            Loading live database records…
          </div>
        )}
        {dataError && usesSharedData && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            Could not load dashboard data from the backend: {dataError}
          </div>
        )}
        {!dataLoading &&
          !dataError &&
          rawUsers.length === 0 &&
          usesSharedData && (
            <div
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
            >
              The backend returned no employee records for {periodKey}. No demo
              data is being displayed.
            </div>
          )}
        {/* Active Tab Content */}
        {activeTab === "overall" && (
          <OverallTab
            users={rawUsers}
            trend={trendData}
            timeGrain={timeGrain}
            periodKey={periodKey}
          />
        )}
        {activeTab === "copilot" && (
          <>
          {copilotDataError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load Copilot data from the database: {copilotDataError}</div>}
          <CopilotTab
            users={filteredCopilotUsers}
            trend={copilotTrendData}
            departments={copilotDepartmentSummaries}
            managers={copilotManagerSummaries}
            selectedDept={selectedDept}
            onSelectDept={handleSelectDept}
            selectedManager={selectedManager}
            onSelectManager={handleSelectManager}
            timeGrain={timeGrain}
            periodKey={periodKey}
          />
          </>
        )}
        {activeTab === "claude" && <ClaudeTab periodKey={periodKey} />}
        {activeTab === "chatgpt" && <ChatGPTTab periodKey={periodKey} />}

        {/* Global User Directory Table */}
        {(activeTab === "copilot" || activeTab === "claude") && (
          <section aria-label="User Directory Section">
            <UserTable users={activeTab === "copilot" ? filteredCopilotUsers : filteredUsers} activePlatformTab={activeTab} />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/michaels_logo.png"
              alt="Michaels"
              className="h-4.5 w-auto object-contain opacity-90"
            />
            <span className="text-slate-300">|</span>
            <span className="font-bold text-slate-800">TokenIQ</span>
            <span>•</span>
            <span>
              Intelligent Token & AI Usage Analytics (Copilot, Claude & ChatGPT)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">Export:</span>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
            >
              Download Excel
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}