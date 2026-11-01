/**
 * Demo-mode data layer.
 *
 * `src/data/demoData.json` is the single source of truth for EVERY dummy tab
 * (Overall, Claude, ChatGPT). Copilot is never served from here: it always reads
 * the live PostgreSQL-backed endpoints.
 *
 * When `VITE_USE_DUMMY_DATA=false`, `services/api.ts` skips this module's builders
 * and calls the FastAPI routes instead, so every tab reads from the database.
 */
import demoDataJson from "../data/demoData.json";
import type {
  BusinessFunction,
  ChatGPTUsage,
  ClaudeUsage,
  CopilotUsage,
  DepartmentName,
  PlatformKPIs,
  TimeGrain,
  TrendDataPoint,
  UnifiedUser,
  UserSegment,
} from "../types/dashboard";
import type { OverallChatGPTRow } from "../utils/overall";
import type {
  BackendHealth,
  ChatGPTReportAnalytics,
  ChatGPTReportModel,
  ChatGPTReportUser,
  ClaudeReportAnalytics,
  ClaudeReportModel,
  ClaudeReportUser,
} from "./api";
import {
  calculateClaudeKPIs,
  calculateCopilotKPIs,
  calculatePowerScore,
} from "../utils/analytics";

/* ------------------------------------------------------------------ */
/* Raw JSON shape                                                      */
/* ------------------------------------------------------------------ */

interface DemoEmployeeRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  department: DepartmentName;
  businessFunction: BusinessFunction;
  title: string;
  employeeStatus?: string;
  managerUserName?: string;
  managerName: string;
  managerLevel3UserId?: string | null;
  managerLevel3UserName?: string | null;
  location?: string;
}

interface DemoCopilotRecord {
  licensed: boolean;
  seatCost: number;
  status: "Active" | "Never used";
  segment: UserSegment;
  lastActiveDate: string | null;
  promptsTotal: number;
  promptsWork: number;
  promptsWeb: number;
  activeDaysCount: number;
  appsUsedCount: number;
  apps: CopilotUsage["apps"];
}

interface DemoClaudeRecord {
  licensed: boolean;
  licenseTier: "Team" | "Enterprise";
  seatCost: number;
  tokenCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  requestCount: number;
  activeDaysCount: number;
  lastActiveDate: string | null;
  favoriteModel: string;
}

interface DemoChatGPTRecord {
  licensed: boolean;
  seatCost: number;
  tokenCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  requestCount: number;
  activeDaysCount: number;
  lastActiveDate: string | null;
  favoriteModel: string;
}

interface DemoUserRecord {
  employee: DemoEmployeeRecord;
  copilot: DemoCopilotRecord | null;
  claude: DemoClaudeRecord | null;
  chatgpt: DemoChatGPTRecord | null;
}

interface DemoDataFile {
  asOfDate: string;
  periodKey: string;
  users: DemoUserRecord[];
}

const DEMO = demoDataJson as unknown as DemoDataFile;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const WEEKLY_FACTOR = 0.25;

const factorFor = (periodType: TimeGrain): number =>
  periodType === "WEEKLY" ? WEEKLY_FACTOR : 1;

const scale = (value: number, factor: number): number =>
  Math.round(value * factor);

const money = (value: number): number => Math.round(value * 100) / 100;

const grainForPeriod = (periodKey: string): TimeGrain =>
  periodKey === "LATEST_WEEK" || /-W\d+$/.test(periodKey) ? "WEEKLY" : "MONTHLY";

const dateDaysAgo = (daysAgo: number): string => {
  const date = new Date(`${DEMO.asOfDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

const daysSince = (date: string | null): number | null => {
  if (!date) return null;
  const from = Date.parse(`${DEMO.asOfDate}T00:00:00Z`);
  const to = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.max(0, Math.round((from - to) / 86_400_000));
};

const clampDays = (days: number, periodType: TimeGrain): number =>
  periodType === "WEEKLY"
    ? Math.min(7, Math.max(0, Math.ceil(days * WEEKLY_FACTOR)))
    : days;

const segmentFromTokens = (tokens: number): UserSegment => {
  if (tokens >= 5_000_000) return "Power";
  if (tokens >= 1_500_000) return "Regular";
  return "Light";
};

/** Split a total across models with fixed weights; the last slice absorbs rounding. */
const splitAcrossModels = <K extends string>(
  models: readonly K[],
  weights: readonly number[],
  totalTokens: number,
  totalCost: number,
): Record<K, { tokens: number; cost: number }> => {
  const result = {} as Record<K, { tokens: number; cost: number }>;
  let usedTokens = 0;
  let usedCost = 0;

  models.forEach((model, index) => {
    const isLast = index === models.length - 1;
    const tokens = isLast
      ? Math.max(0, totalTokens - usedTokens)
      : Math.round(totalTokens * weights[index]);
    const cost = isLast
      ? Math.max(0, money(totalCost - usedCost))
      : money(totalCost * weights[index]);

    usedTokens += tokens;
    usedCost += cost;
    result[model] = { tokens, cost };
  });

  return result;
};

const CLAUDE_MODELS = [
  "claude-3-7-sonnet",
  "claude-3-5-sonnet",
  "claude-3-5-haiku",
  "claude-3-opus",
] as const;
const CLAUDE_MODEL_WEIGHTS = [0.55, 0.3, 0.1, 0.05] as const;

const CHATGPT_MODELS = ["gpt-5", "gpt-4.1", "gpt-4o", "gpt-4o-mini"] as const;
const CHATGPT_MODEL_WEIGHTS = [0.45, 0.3, 0.17, 0.08] as const;

/* ------------------------------------------------------------------ */
/* Unified users (Overall + Copilot-style user directory)              */
/* ------------------------------------------------------------------ */

const buildCopilotUsage = (
  record: DemoCopilotRecord,
  periodType: TimeGrain,
  periodKey: string,
): CopilotUsage => {
  const factor = factorFor(periodType);
  return {
    reportDate: DEMO.asOfDate,
    periodKey,
    periodType,
    licensed: record.licensed,
    seatCost: record.seatCost,
    status: record.status,
    segment: record.segment,
    lastActiveDate: record.lastActiveDate,
    daysSinceActive: daysSince(record.lastActiveDate),
    promptsTotal: scale(record.promptsTotal, factor),
    promptsWork: scale(record.promptsWork, factor),
    promptsWeb: scale(record.promptsWeb, factor),
    activeDaysCount: clampDays(record.activeDaysCount, periodType),
    appsUsedCount: record.appsUsedCount,
    apps: { ...record.apps },
  };
};

const buildClaudeUsage = (
  record: DemoClaudeRecord,
  periodType: TimeGrain,
  periodKey: string,
): ClaudeUsage => {
  const factor = factorFor(periodType);
  const monthlyTokens =
    record.inputTokens +
    record.outputTokens +
    record.cacheReadTokens +
    record.cacheCreationTokens;
  const tokenCostUsd = money(record.tokenCostUsd * factor);

  return {
    reportDate: DEMO.asOfDate,
    periodKey,
    periodType,
    licensed: record.licensed,
    licenseTier: record.licenseTier,
    seatCost: record.seatCost,
    tokenCostUsd,
    totalMonthlyCost: money(record.seatCost + tokenCostUsd),
    status: "Active",
    segment: segmentFromTokens(monthlyTokens),
    lastActiveDate: record.lastActiveDate,
    daysSinceActive: daysSince(record.lastActiveDate),
    totalTokens: scale(monthlyTokens, factor),
    inputTokens: scale(record.inputTokens, factor),
    outputTokens: scale(record.outputTokens, factor),
    cacheReadTokens: scale(record.cacheReadTokens, factor),
    cacheCreationTokens: scale(record.cacheCreationTokens, factor),
    requestCount: scale(record.requestCount, factor),
    activeDaysCount: clampDays(record.activeDaysCount, periodType),
    favoriteModel: record.favoriteModel,
    modelBreakdown: splitAcrossModels(
      CLAUDE_MODELS,
      CLAUDE_MODEL_WEIGHTS,
      scale(monthlyTokens, factor),
      tokenCostUsd,
    ),
  };
};

const buildChatGPTUsage = (
  record: DemoChatGPTRecord,
  periodType: TimeGrain,
  periodKey: string,
): ChatGPTUsage => {
  const factor = factorFor(periodType);
  const monthlyTokens =
    record.inputTokens + record.outputTokens + record.cachedTokens;
  const tokenCostUsd = money(record.tokenCostUsd * factor);

  return {
    reportDate: DEMO.asOfDate,
    periodKey,
    periodType,
    licensed: record.licensed,
    seatCost: record.seatCost,
    tokenCostUsd,
    totalMonthlyCost: money(record.seatCost + tokenCostUsd),
    status: "Active",
    segment: segmentFromTokens(monthlyTokens),
    lastActiveDate: record.lastActiveDate,
    daysSinceActive: daysSince(record.lastActiveDate),
    totalTokens: scale(monthlyTokens, factor),
    inputTokens: scale(record.inputTokens, factor),
    outputTokens: scale(record.outputTokens, factor),
    cachedTokens: scale(record.cachedTokens, factor),
    requestCount: scale(record.requestCount, factor),
    activeDaysCount: clampDays(record.activeDaysCount, periodType),
    favoriteModel: record.favoriteModel,
    modelBreakdown: splitAcrossModels(
      CHATGPT_MODELS,
      CHATGPT_MODEL_WEIGHTS,
      scale(monthlyTokens, factor),
      tokenCostUsd,
    ),
  };
};

export function demoUsers(
  periodType: TimeGrain,
  periodKey: string = DEMO.periodKey,
): UnifiedUser[] {
  return DEMO.users.map((record) => {
    const copilot = record.copilot
      ? buildCopilotUsage(record.copilot, periodType, periodKey)
      : undefined;
    const claude = record.claude
      ? buildClaudeUsage(record.claude, periodType, periodKey)
      : undefined;
    const chatgpt = record.chatgpt
      ? buildChatGPTUsage(record.chatgpt, periodType, periodKey)
      : undefined;

    const activeCount = (copilot?.licensed ? 1 : 0) + (claude?.licensed ? 1 : 0) + (chatgpt?.licensed ? 1 : 0);

    const user: UnifiedUser = {
      employee: { ...record.employee },
      copilot,
      claude,
      chatgpt,
      platforms: activeCount > 1 ? "both" : copilot ? "copilot" : "claude",
      totalSpend: money(
        (copilot?.seatCost ?? 0) + (claude?.totalMonthlyCost ?? 0) + (chatgpt?.totalMonthlyCost ?? 0),
      ),
      primarySegment: copilot?.segment ?? claude?.segment ?? chatgpt?.segment ?? "Light",
      isMultiPlatform: activeCount > 1,
      powerScore: 0,
    };

    return { ...user, powerScore: calculatePowerScore(user) };
  });
}

/* ------------------------------------------------------------------ */
/* Overall tab ChatGPT rows                                            */
/* ------------------------------------------------------------------ */

export function demoChatGPTUsers(periodType: TimeGrain): OverallChatGPTRow[] {
  const factor = factorFor(periodType);

  return DEMO.users
    .filter((record) => record.chatgpt?.licensed)
    .map((record) => {
      const usage = record.chatgpt as DemoChatGPTRecord;
      return {
        email: record.employee.email,
        displayName: record.employee.name,
        tokens: scale(
          usage.inputTokens + usage.outputTokens + usage.cachedTokens,
          factor,
        ),
        requests: scale(usage.requestCount, factor),
        tokenCostUsd: money(usage.tokenCostUsd * factor),
        seatCostUsd: 0,
      };
    });
}

/* ------------------------------------------------------------------ */
/* Trends                                                              */
/* ------------------------------------------------------------------ */

const TREND_WEIGHTS = [0.09, 0.11, 0.13, 0.14, 0.12, 0.14, 0.15, 0.12];
const TREND_POINTS = TREND_WEIGHTS.length;

const trendDate = (index: number, periodType: TimeGrain): string => {
  const step = periodType === "WEEKLY" ? 1 : 3;
  return dateDaysAgo((TREND_POINTS - 1 - index) * step);
};

export function demoTrend(periodType: TimeGrain): TrendDataPoint[] {
  const users = demoUsers(periodType);
  const copilotUsers = users.filter((user) => user.copilot?.licensed);
  const claudeUsers = users.filter((user) => user.claude?.licensed);

  const copilotLicensed = copilotUsers.length;
  const claudeLicensed = claudeUsers.length;
  const copilotActive = copilotUsers.filter(
    (user) => user.copilot?.status === "Active",
  ).length;
  const claudeActive = claudeUsers.length;
  const copilotSpend = copilotUsers.reduce(
    (sum, user) => sum + (user.copilot?.seatCost ?? 0),
    0,
  );
  const claudeSpend = claudeUsers.reduce(
    (sum, user) => sum + (user.claude?.totalMonthlyCost ?? 0),
    0,
  );
  const totalTokensClaude = claudeUsers.reduce(
    (sum, user) => sum + (user.claude?.totalTokens ?? 0),
    0,
  );
  const totalPromptsCopilot = copilotUsers.reduce(
    (sum, user) => sum + (user.copilot?.promptsTotal ?? 0),
    0,
  );

  return TREND_WEIGHTS.map((weight, index) => {
    const date = trendDate(index, periodType);
    return {
      date,
      label: date,
      copilotLicensed,
      copilotActive: Math.max(
        1,
        Math.min(
          copilotLicensed,
          Math.round(copilotActive * (0.7 + weight * 2.2)),
        ),
      ),
      claudeLicensed,
      claudeActive: Math.max(
        1,
        Math.min(claudeLicensed, Math.round(claudeActive * (0.65 + weight * 2.4))),
      ),
      copilotSpend: money(copilotSpend * weight),
      claudeSpend: money(claudeSpend * weight),
      totalTokensClaude: Math.round(totalTokensClaude * weight),
      totalPromptsCopilot: Math.round(totalPromptsCopilot * weight),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Provider reports (Claude / ChatGPT tabs)                            */
/* ------------------------------------------------------------------ */

const buildReportTrend = (
  totalTokens: number,
  totalRequests: number,
  totalCost: number,
  periodType: TimeGrain,
) =>
  TREND_WEIGHTS.map((weight, index) => {
    const date = trendDate(index, periodType);
    return {
      date,
      label: date,
      tokens: Math.round(totalTokens * weight),
      requests: Math.round(totalRequests * weight),
      costUsd: money(totalCost * weight),
    };
  });

const aggregateModels = <K extends string>(
  users: Array<{ breakdown: Record<K, { tokens: number; cost: number }> }>,
) => {
  const totals = new Map<K, { tokens: number; cost: number }>();
  for (const user of users) {
    for (const [model, value] of Object.entries(user.breakdown) as Array<
      [K, { tokens: number; cost: number }]
    >) {
      if (value.tokens <= 0) continue;
      const current = totals.get(model) ?? { tokens: 0, cost: 0 };
      current.tokens += value.tokens;
      current.cost += value.cost;
      totals.set(model, current);
    }
  }
  return totals;
};

/** Distribute aggregate shares so per-model token slices add back up to the total. */
const splitTokenShares = (
  tokens: number,
  shares: { input: number; output: number; cacheRead: number; cacheCreation: number },
  totalRequests: number,
  totalTokens: number,
  costUsd: number,
): ClaudeReportModel => {
  const inputTokens = Math.floor(tokens * shares.input);
  const outputTokens = Math.floor(tokens * shares.output);
  const cacheReadTokens = Math.floor(tokens * shares.cacheRead);
  const cacheCreationTokens = Math.max(
    0,
    tokens - inputTokens - outputTokens - cacheReadTokens,
  );

  return {
    model: "",
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    totalTokens: tokens,
    requests:
      totalTokens > 0 ? Math.round(totalRequests * (tokens / totalTokens)) : 0,
    costUsd: money(costUsd),
  };
};

export function demoClaudeReport(periodKey: string): ClaudeReportAnalytics {
  const periodType = grainForPeriod(periodKey);
  const users = demoUsers(periodType, periodKey).filter(
    (user): user is UnifiedUser & { claude: ClaudeUsage } => Boolean(user.claude),
  );

  const totals = users.reduce(
    (acc, user) => {
      const usage = user.claude;
      acc.inputTokens += usage.inputTokens;
      acc.outputTokens += usage.outputTokens;
      acc.cacheReadTokens += usage.cacheReadTokens;
      acc.cacheCreationTokens += usage.cacheCreationTokens;
      acc.totalTokens += usage.totalTokens;
      acc.requests += usage.requestCount;
      acc.costUsd += usage.tokenCostUsd;
      return acc;
    },
    {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      totalTokens: 0,
      requests: 0,
      costUsd: 0,
    },
  );

  const modelTotals = aggregateModels(
    users.map((user) => ({ breakdown: user.claude.modelBreakdown })),
  );

  const shares = {
    input: totals.totalTokens ? totals.inputTokens / totals.totalTokens : 0,
    output: totals.totalTokens ? totals.outputTokens / totals.totalTokens : 0,
    cacheRead: totals.totalTokens
      ? totals.cacheReadTokens / totals.totalTokens
      : 0,
    cacheCreation: totals.totalTokens
      ? totals.cacheCreationTokens / totals.totalTokens
      : 0,
  };

  const models: ClaudeReportModel[] = [...modelTotals.entries()]
    .map(([model, value]) => ({
      ...splitTokenShares(
        value.tokens,
        shares,
        totals.requests,
        totals.totalTokens,
        value.cost,
      ),
      model,
    }))
    .sort((a, b) => b.costUsd - a.costUsd);

  const reportUsers: ClaudeReportUser[] = users
    .map((user) => ({
      userId: user.employee.userId ?? user.employee.id,
      email: user.employee.email,
      displayName: user.employee.name,
      inputTokens: user.claude.inputTokens,
      outputTokens: user.claude.outputTokens,
      cacheReadTokens: user.claude.cacheReadTokens,
      cacheCreationTokens: user.claude.cacheCreationTokens,
      totalTokens: user.claude.totalTokens,
      requests: user.claude.requestCount,
      costUsd: money(user.claude.tokenCostUsd),
      models: (Object.entries(user.claude.modelBreakdown) as Array<
        [string, { tokens: number; cost: number }]
      >)
        .filter(([, value]) => value.tokens > 0)
        .sort((a, b) => b[1].tokens - a[1].tokens)
        .map(([model]) => model),
      lastActivity: user.claude.lastActiveDate,
      department: user.employee.department,
      title: user.employee.title,
    }))
    .sort((a, b) => b.costUsd - a.costUsd);

  const departmentCosts = new Map<string, number>();
  const evpCosts = new Map<string, { evpId: string; evpName: string; costUsd: number }>();
  for (const user of users) {
    const department = user.employee.department;
    departmentCosts.set(
      department,
      (departmentCosts.get(department) ?? 0) + user.claude.tokenCostUsd,
    );

    const evpId = user.employee.managerLevel3UserId?.trim() || "Unassigned";
    const evpName =
      user.employee.managerLevel3UserName?.trim() ||
      (evpId === "Unassigned" ? "Unassigned" : evpId);
    const evp = evpCosts.get(evpId) ?? { evpId, evpName, costUsd: 0 };
    evp.costUsd += user.claude.tokenCostUsd;
    evpCosts.set(evpId, evp);
  }

  const reportedCostUsd = money(totals.costUsd);

  return {
    periodKey,
    source: { usage: "demoData.json", cost: "demoData.json" },
    kpis: {
      activeUsers: users.length,
      totalTokens: totals.totalTokens,
      inputTokens: totals.inputTokens,
      outputTokens: totals.outputTokens,
      cacheReadTokens: totals.cacheReadTokens,
      cacheCreationTokens: totals.cacheCreationTokens,
      requests: totals.requests,
      reportedCostUsd,
      averageCostPerReportingUserUsd: users.length
        ? money(reportedCostUsd / users.length)
        : 0,
      modelCount: models.length,
    },
    models,
    users: reportUsers,
    departments: [...departmentCosts.entries()]
      .map(([department, costUsd]) => ({ department, costUsd: money(costUsd) }))
      .sort((a, b) => b.costUsd - a.costUsd),
    evps: [...evpCosts.values()]
      .map((evp) => ({ ...evp, costUsd: money(evp.costUsd) }))
      .sort((a, b) => b.costUsd - a.costUsd),
    trend: buildReportTrend(
      totals.totalTokens,
      totals.requests,
      reportedCostUsd,
      periodType,
    ),
  };
}

interface DemoChatGPTUser {
  employee: DemoEmployeeRecord;
  chatgptUsage: ChatGPTUsage;
}

export function demoChatGPTReport(periodKey: string): ChatGPTReportAnalytics {
  const periodType = grainForPeriod(periodKey);

  const gptUsers: DemoChatGPTUser[] = DEMO.users
    .filter((record) => record.chatgpt?.licensed)
    .map((record) => ({
      employee: record.employee,
      chatgptUsage: buildChatGPTUsage(
        record.chatgpt as DemoChatGPTRecord,
        periodType,
        periodKey,
      ),
    }));

  const totals = gptUsers.reduce(
    (acc, user) => {
      const usage = user.chatgptUsage;
      acc.inputTokens += usage.inputTokens;
      acc.outputTokens += usage.outputTokens;
      acc.cachedTokens += usage.cachedTokens;
      acc.totalTokens += usage.totalTokens;
      acc.requests += usage.requestCount;
      acc.costUsd += usage.tokenCostUsd;
      return acc;
    },
    {
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      requests: 0,
      costUsd: 0,
    },
  );

  const modelTotals = aggregateModels(
    gptUsers.map((user) => ({ breakdown: user.chatgptUsage.modelBreakdown })),
  );

  const inputShare = totals.totalTokens
    ? totals.inputTokens / totals.totalTokens
    : 0;
  const outputShare = totals.totalTokens
    ? totals.outputTokens / totals.totalTokens
    : 0;

  const models: ChatGPTReportModel[] = [...modelTotals.entries()]
    .map(([model, value]) => {
      const inputTokens = Math.floor(value.tokens * inputShare);
      const outputTokens = Math.floor(value.tokens * outputShare);
      const cachedTokens = Math.max(
        0,
        value.tokens - inputTokens - outputTokens,
      );
      return {
        model,
        inputTokens,
        outputTokens,
        cachedTokens,
        totalTokens: value.tokens,
        requests:
          totals.totalTokens > 0
            ? Math.round(totals.requests * (value.tokens / totals.totalTokens))
            : 0,
        costUsd: money(value.cost),
      };
    })
    .sort((a, b) => b.costUsd - a.costUsd);

  const reportUsers: ChatGPTReportUser[] = gptUsers
    .map((user) => ({
      userId: user.employee.userId ?? user.employee.id,
      email: user.employee.email,
      displayName: user.employee.name,
      inputTokens: user.chatgptUsage.inputTokens,
      outputTokens: user.chatgptUsage.outputTokens,
      cachedTokens: user.chatgptUsage.cachedTokens,
      totalTokens: user.chatgptUsage.totalTokens,
      requests: user.chatgptUsage.requestCount,
      costUsd: money(user.chatgptUsage.tokenCostUsd),
      models: (Object.entries(user.chatgptUsage.modelBreakdown) as Array<
        [string, { tokens: number; cost: number }]
      >)
        .filter(([, value]) => value.tokens > 0)
        .sort((a, b) => b[1].tokens - a[1].tokens)
        .map(([model]) => model),
      lastActivity: user.chatgptUsage.lastActiveDate,
      department: user.employee.department,
      title: user.employee.title,
    }))
    .sort((a, b) => b.costUsd - a.costUsd);

  const departmentCosts = new Map<string, number>();
  const evpCosts = new Map<string, { evpId: string; evpName: string; costUsd: number }>();
  for (const user of gptUsers) {
    const department = user.employee.department;
    departmentCosts.set(
      department,
      (departmentCosts.get(department) ?? 0) +
        user.chatgptUsage.tokenCostUsd,
    );

    const evpId = user.employee.managerLevel3UserId?.trim() || "Unassigned";
    const evpName =
      user.employee.managerLevel3UserName?.trim() ||
      (evpId === "Unassigned" ? "Unassigned" : evpId);
    const evp = evpCosts.get(evpId) ?? { evpId, evpName, costUsd: 0 };
    evp.costUsd += user.chatgptUsage.tokenCostUsd;
    evpCosts.set(evpId, evp);
  }

  const reportedCostUsd = money(totals.costUsd);

  return {
    periodKey,
    source: { usage: "demoData.json", cost: "demoData.json" },
    kpis: {
      activeUsers: gptUsers.length,
      totalTokens: totals.totalTokens,
      inputTokens: totals.inputTokens,
      outputTokens: totals.outputTokens,
      cachedTokens: totals.cachedTokens,
      requests: totals.requests,
      reportedCostUsd,
      averageCostPerReportingUserUsd: gptUsers.length
        ? money(reportedCostUsd / gptUsers.length)
        : 0,
      modelCount: models.length,
    },
    models,
    users: reportUsers,
    departments: [...departmentCosts.entries()]
      .map(([department, costUsd]) => ({ department, costUsd: money(costUsd) }))
      .sort((a, b) => b.costUsd - a.costUsd),
    evps: [...evpCosts.values()]
      .map((evp) => ({ ...evp, costUsd: money(evp.costUsd) }))
      .sort((a, b) => b.costUsd - a.costUsd),
    trend: buildReportTrend(
      totals.totalTokens,
      totals.requests,
      reportedCostUsd,
      periodType,
    ),
  };
}

/* ------------------------------------------------------------------ */
/* KPIs / health                                                       */
/* ------------------------------------------------------------------ */

export function demoPlatformKpis(
  platform: "copilot" | "claude" | "chatgpt",
  periodType: TimeGrain = "MONTHLY",
): PlatformKPIs {
  const users = demoUsers(periodType);

  if (platform === "copilot") return calculateCopilotKPIs(users);
  if (platform === "claude") return calculateClaudeKPIs(users);

  const factor = factorFor(periodType);
  const records = DEMO.users.filter((record) => record.chatgpt?.licensed);
  const totalMonthlySpend = records.reduce((sum, record) => {
    const usage = record.chatgpt as DemoChatGPTRecord;
    return sum + usage.seatCost + usage.tokenCostUsd * factor;
  }, 0);
  const totalVolume = records.reduce((sum, record) => {
    const usage = record.chatgpt as DemoChatGPTRecord;
    return (
      sum +
      scale(
        usage.inputTokens + usage.outputTokens + usage.cachedTokens,
        factor,
      )
    );
  }, 0);

  return {
    licensedUsers: records.length,
    activeUsers28d: records.length,
    weeklyActiveUsers: records.length,
    utilizationRate: records.length ? 100 : 0,
    idleUsersCount: 0,
    neverUsedCount: 0,
    totalMonthlySpend: money(totalMonthlySpend),
    avgSpendPerActiveUser: records.length
      ? money(totalMonthlySpend / records.length)
      : 0,
    totalVolume,
    avgVolumePerActive: records.length
      ? Math.round(totalVolume / records.length)
      : 0,
    purchasedSeats: records.length,
    telemetrySource: "demoData.json",
  };
}

export function demoHealth(): BackendHealth {
  return {
    status: "ok",
    database: "Demo data (src/data/demoData.json)",
    database_connected: true,
    schema_mode: "demo",
    tables_used: ["demoData.json"],
    query_engine: "local JSON demo data",
  };
}
