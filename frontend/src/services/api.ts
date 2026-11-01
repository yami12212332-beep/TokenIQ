/**
 * API client. Database-backed endpoints are authoritative: failures are surfaced,
 * never replaced with generated demo data.
 *
 * Demo mode is controlled by `VITE_USE_DUMMY_DATA` (default: true).
 * - `true`  -> Overall / Claude / ChatGPT are built from `src/data/demoData.json`.
 * - `false` -> every tab (including Overall / Claude / ChatGPT) reads the FastAPI
 *              backend and PostgreSQL. Copilot always reads the backend regardless.
 */
import type {
  PlatformKPIs,
  UnifiedUser,
  TimeGrain,
  TrendDataPoint,
} from "../types/dashboard";
import type { OverallChatGPTRow } from "../utils/overall";
import {
  demoChatGPTReport,
  demoChatGPTUsers,
  demoClaudeReport,
  demoHealth,
  demoPlatformKpis,
  demoTrend,
  demoUsers,
} from "./demoData";

// Backend location comes from frontend/.env (VITE_API_URL).
const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const API_BASE = `${API_ORIGIN}/api`;

export interface BackendHealth {
  status: string;
  database: string;
  database_connected: boolean;
  schema_mode: string;
  tables_used: string[];
  query_engine: string;
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `API request failed (${response.status})${body ? `: ${body.slice(0, 240)}` : ""}`,
    );
  }

  // A common misconfiguration is that the frontend dev server returns index.html
  // for /api/* instead of forwarding the request to FastAPI.
  if (!contentType.toLowerCase().includes("application/json")) {
    const preview = body.trim().slice(0, 80).replace(/\s+/g, " ");
    throw new Error(
      `Expected JSON from ${url}, but received ${contentType || "an unknown content type"}${preview.startsWith("<!doctype") || preview.startsWith("<html") ? ". The request reached a server that is not the FastAPI backend. Check VITE_API_URL in frontend/.env." : ` (response starts: ${preview})`}`,
    );
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(
      `The API returned invalid JSON from ${url}. Check the backend response and API URL.`,
    );
  }
}

export interface ClaudeReportModel {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
  requests: number;
  costUsd: number;
}

export interface ClaudeReportUser {
  userId: string | null;
  email: string | null;
  displayName: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
  requests: number;
  costUsd: number;
  models: string[];
  lastActivity: string | null;
  /** Present for demo data; the backend does not join Workday yet. */
  department?: string;
  title?: string;
}

export interface ClaudeReportAnalytics {
  periodKey: string;
  source: { usage: string; cost: string };
  kpis: {
    activeUsers: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    requests: number;
    reportedCostUsd: number;
    averageCostPerReportingUserUsd: number;
    modelCount: number;
  };
  models: ClaudeReportModel[];
  users: ClaudeReportUser[];
  departments: Array<{ department: string; costUsd: number }>;
  /** Cost grouped by EVP (Workday manager_level_3_user_id) */
  evps?: Array<{ evpId: string; evpName: string; costUsd: number }>;
  trend: Array<{
    date: string;
    label: string;
    tokens: number;
    requests: number;
    costUsd: number;
  }>;
}

export interface ChatGPTReportModel {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
  requests: number;
  costUsd: number;
}

export interface ChatGPTReportUser {
  userId: string | null;
  email: string | null;
  displayName: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
  requests: number;
  costUsd: number;
  models: string[];
  lastActivity: string | null;
  /** Present for demo data; the backend does not join Workday yet. */
  department?: string;
  title?: string;
}

export interface ChatGPTReportAnalytics {
  periodKey: string;
  source: { usage: string; cost: string };
  kpis: {
    activeUsers: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    requests: number;
    reportedCostUsd: number;
    averageCostPerReportingUserUsd: number;
    modelCount: number;
  };
  models: ChatGPTReportModel[];
  users: ChatGPTReportUser[];
  departments: Array<{ department: string; costUsd: number }>;
  /** Cost grouped by EVP (Workday manager_level_3_user_id) */
  evps?: Array<{ evpId: string; evpName: string; costUsd: number }>;
  trend: Array<{
    date: string;
    label: string;
    tokens: number;
    requests: number;
    costUsd: number;
  }>;
}

export interface DashboardUsersResponse {
  periodKey: string;
  periodType: TimeGrain;
  count: number;
  users: UnifiedUser[];
}

export interface OverallChatGPTResponse {
  source: "database" | "sample" | "unavailable";
  periodKey?: string;
  rows: OverallChatGPTRow[];
}

/**
 * Demo mode switch. Set `VITE_USE_DUMMY_DATA=false` in frontend/.env to make
 * Overall, Claude and ChatGPT read live PostgreSQL data through the backend.
 */
export const USE_DUMMY_DATA =
  (import.meta.env.VITE_USE_DUMMY_DATA ?? "true").toLowerCase() !== "false";

export const ApiService = {
  // Copilot ALWAYS reads live PostgreSQL-backed dashboard data.
  getCopilotDatabaseUsers: (periodType: TimeGrain, periodKey: string) =>
    requestJson<DashboardUsersResponse>(
      `${API_BASE}/dashboard/users?period_type=${periodType}&period_key=${encodeURIComponent(periodKey)}`,
    ),
  getCopilotDatabaseTrends: (periodType: TimeGrain, periodKey: string) =>
    requestJson<{ periodType: TimeGrain; count: number; rows: TrendDataPoint[] }>(
      `${API_BASE}/dashboard/trends?period_type=${periodType}&period_key=${encodeURIComponent(periodKey)}`,
    ),
  getCopilotDatabaseKpis: (periodType = "MONTHLY", periodKey = "2026-10") =>
    requestJson<PlatformKPIs>(
      `${API_BASE}/copilot/kpis?period_type=${periodType}&period_key=${encodeURIComponent(periodKey)}`,
    ),

  // Shared user directory used by the Overall tab (and its UserTable).
  getDashboardUsers: (periodType: TimeGrain, periodKey: string) => {
    if (USE_DUMMY_DATA) {
      const users = demoUsers(periodType, periodKey);
      return Promise.resolve({
        periodKey,
        periodType,
        count: users.length,
        users,
      });
    }
    return requestJson<DashboardUsersResponse>(
      `${API_BASE}/dashboard/users?period_type=${periodType}&period_key=${encodeURIComponent(periodKey)}`,
    );
  },
  getDashboardTrends: (periodType: TimeGrain, periodKey: string) => {
    if (USE_DUMMY_DATA) {
      const rows = demoTrend(periodType);
      return Promise.resolve({ periodType, count: rows.length, rows });
    }
    return requestJson<{
      periodType: TimeGrain;
      count: number;
      rows: TrendDataPoint[];
    }>(
      `${API_BASE}/dashboard/trends?period_type=${periodType}&period_key=${encodeURIComponent(periodKey)}`,
    );
  },

  // Per-user ChatGPT rows the Overall tab merges with the shared directory.
  getOverallChatGPTUsers: (
    periodType: TimeGrain,
    periodKey: string,
  ): Promise<OverallChatGPTResponse> =>
    USE_DUMMY_DATA
      ? Promise.resolve({
          source: "sample" as const,
          periodKey,
          rows: demoChatGPTUsers(periodType),
        })
      : requestJson<OverallChatGPTResponse>(
          `${API_BASE}/overall/chatgpt-users?period_type=${periodType}&period_key=${encodeURIComponent(periodKey)}`,
        ),

  getHealth: (): Promise<BackendHealth> =>
    USE_DUMMY_DATA
      ? Promise.resolve(demoHealth())
      : requestJson<BackendHealth>(`${API_BASE}/health`),

  getCopilotKpis: (periodType: TimeGrain = "MONTHLY", periodKey = "2026-10") =>
    requestJson<PlatformKPIs>(
      `${API_BASE}/copilot/kpis?period_type=${periodType}&period_key=${encodeURIComponent(periodKey)}`,
    ),
  getClaudeKpis: (periodType: TimeGrain = "MONTHLY", periodKey = "2026-10") =>
    USE_DUMMY_DATA
      ? Promise.resolve(demoPlatformKpis("claude", periodType))
      : requestJson<PlatformKPIs>(
          `${API_BASE}/claude/kpis?period_type=${periodType}&period_key=${encodeURIComponent(periodKey)}`,
        ),
  getClaudeReportAnalytics: (periodKey: string): Promise<ClaudeReportAnalytics> =>
    USE_DUMMY_DATA
      ? Promise.resolve(demoClaudeReport(periodKey))
      : requestJson<ClaudeReportAnalytics>(
          `${API_BASE}/claude/analytics?period_key=${encodeURIComponent(periodKey)}`,
        ),

  getChatGPTKpis: (periodType: TimeGrain = "MONTHLY", periodKey = "2026-10") =>
    USE_DUMMY_DATA
      ? Promise.resolve(demoPlatformKpis("chatgpt", periodType))
      : requestJson<PlatformKPIs>(
          `${API_BASE}/chatgpt/kpis?period_type=${periodType}&period_key=${encodeURIComponent(periodKey)}`,
        ),
  getChatGPTModels: (periodKey: string) =>
    USE_DUMMY_DATA
      ? Promise.resolve(
          demoChatGPTReport(periodKey).models.map((model) => ({
            id: model.model,
            name: model.model,
            tokens: model.totalTokens,
            cost: model.costUsd,
          })),
        )
      : requestJson<Array<{ id: string; name: string; tokens: number; cost: number }>>(
          `${API_BASE}/chatgpt/models?period_key=${encodeURIComponent(periodKey)}`,
        ),
  getChatGPTReportAnalytics: (periodKey: string): Promise<ChatGPTReportAnalytics> =>
    USE_DUMMY_DATA
      ? Promise.resolve(demoChatGPTReport(periodKey))
      : requestJson<ChatGPTReportAnalytics>(
          `${API_BASE}/chatgpt/analytics?period_key=${encodeURIComponent(periodKey)}`,
        ),

  getTrends: (periodType = "MONTHLY") =>
    requestJson(`${API_BASE}/trend?period_type=${periodType}`),
};
