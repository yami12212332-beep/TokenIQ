export type Platform = 'copilot' | 'claude' | 'both';

export type UserSegment = 'Power' | 'Regular' | 'Light' | 'Never used';

export type TimeGrain = 'MONTHLY' | 'WEEKLY';

export interface TimePeriodOption {
  type: TimeGrain;
  key: string;      // e.g. '2026-10' or '2026-W42'
  label: string;    // e.g. 'October 2026' or 'Week 42 (Oct 13-19)'
  startDate: string;
  endDate: string;
}

export type DepartmentName = 
  | 'Engineering' 
  | 'Product & Design' 
  | 'Sales & Solutions' 
  | 'Marketing' 
  | 'Customer Support' 
  | 'Finance & Legal';

export type BusinessFunction = 
  | 'Core Tech' 
  | 'Go-To-Market' 
  | 'Operations' 
  | 'Corporate & Admin';

export interface Employee {
  id: string; // employee_id
  userId?: string;
  name: string; // full_name
  email: string; // email_work
  emailHome?: string;
  department: DepartmentName;
  businessFunction: BusinessFunction; // division
  division?: string;
  title: string; // job_title
  employeeStatus?: string;
  managerUserName?: string;
  managerName: string;
  location?: string;
  hireDate?: string;
  managerLevel1UserName?: string;
  managerLevel3UserId?: string | null; // EVP grouping key (Workday manager_level_3_user_id)
  managerLevel3UserName?: string | null;
  avatarUrl?: string;
}

export interface ManagerSummary {
  /** Stable grouping key (EVP summaries: manager_level_3_user_id) */
  managerId?: string;
  managerName: string;
  managerUserName: string;
  department: string;
  division?: string;
  directReportsCount: number;
  totalTeamSpend: number;
  copilotLicensed: number;
  copilotActive: number;
  copilotSpend: number;
  copilotPrompts: number;
  claudeActive: number;
  claudeSpend: number;
  claudeTokens: number;
  utilizationRate: number;
  reclaimPotentialSpend: number;
  topTeamMembers: string[];
}

export interface CopilotUsage {
  reportDate: string;
  periodKey: string;
  periodType: TimeGrain;
  licensed: boolean;
  seatCost: number; // monthly seat cost e.g. $30
  status: 'Active' | 'Never used'; // Never used = no activity in the selected period
  segment: UserSegment;
  lastActiveDate: string | null;
  daysSinceActive: number | null; // days between the snapshot's as-of date and last activity
  promptsTotal: number;
  promptsWork: number;
  promptsWeb: number;
  activeDaysCount: number;
  appsUsedCount: number;
  apps: {
    chat: boolean;
    teams: boolean;
    word: boolean;
    excel: boolean;
    powerpoint: boolean;
    onenote: boolean;
  };
}

export interface ClaudeUsage {
  reportDate: string;
  periodKey: string;
  periodType: TimeGrain;
  licensed: boolean;
  licenseTier: 'Team' | 'Enterprise';
  seatCost: number; // base seat license e.g. $20
  tokenCostUsd: number; // token consumption cost
  totalMonthlyCost: number; // seatCost + tokenCostUsd
  status: 'Active'; // Claude users are listed only when they have usage in the period
  segment: UserSegment;
  lastActiveDate: string | null;
  daysSinceActive: number | null;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  requestCount: number;
  activeDaysCount: number;
  favoriteModel: string;
  modelBreakdown: {
    'claude-3-7-sonnet': { tokens: number; cost: number };
    'claude-3-5-sonnet': { tokens: number; cost: number };
    'claude-3-5-haiku': { tokens: number; cost: number };
    'claude-3-opus': { tokens: number; cost: number };
  };
}

export interface ChatGPTUsage {
  reportDate: string;
  periodKey: string;
  periodType: TimeGrain;
  licensed: boolean;
  seatCost: number; // base seat license e.g. $30
  tokenCostUsd: number; // token consumption cost
  totalMonthlyCost: number; // seatCost + tokenCostUsd
  status: 'Active'; // ChatGPT users are listed only when they have usage in the period
  segment: UserSegment;
  lastActiveDate: string | null;
  daysSinceActive: number | null;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  requestCount: number;
  activeDaysCount: number;
  favoriteModel: string;
  modelBreakdown: {
    'gpt-5': { tokens: number; cost: number };
    'gpt-4.1': { tokens: number; cost: number };
    'gpt-4o': { tokens: number; cost: number };
    'gpt-4o-mini': { tokens: number; cost: number };
  };
}

export interface UnifiedUser {
  employee: Employee;
  copilot?: CopilotUsage;
  claude?: ClaudeUsage;
  chatgpt?: ChatGPTUsage;
  platforms: Platform;
  totalSpend: number;
  primarySegment: UserSegment;
  isMultiPlatform: boolean;
  powerScore: number; // 0 to 100
}

export interface PlatformKPIs {
  licensedUsers: number;
  activeUsers28d: number;
  weeklyActiveUsers: number;
  utilizationRate: number; // %
  idleUsersCount: number;
  neverUsedCount: number;
  totalMonthlySpend: number;
  avgSpendPerActiveUser: number;
  totalVolume: number; // prompts for copilot, tokens for claude
  avgVolumePerActive: number;
  purchasedSeats: number;
  rosterRestricted?: boolean; // Set true when /organization/users is restricted
  telemetrySource?: string;
}

export interface TrendDataPoint {
  date: string;
  label: string;
  copilotLicensed: number;
  copilotActive: number;
  claudeLicensed: number;
  claudeActive: number;
  copilotSpend: number;
  claudeSpend: number;
  totalTokensClaude: number;
  totalPromptsCopilot: number;
}

export interface OverallKPIs {
  totalLicensedSeats: number;
  totalUniqueEmployeesLicensed: number;
  bothPlatformsCount: number;
  copilotOnlyCount: number;
  claudeOnlyCount: number;
  combinedActiveUsers: number;
  combinedMonthlySpend: number;
  copilotSpend: number;
  claudeSpend: number;
  combinedUtilizationRate: number;
  potentialReclaimMonthlySavings: number;
  estimatedHoursSavedMonthly: number;
  estimatedMonthlyValueAdded: number;
}

export interface RoiParameters {
  hoursSavedPerWeekPerActiveUser: number;
  blendedHourlyWage: number;
  productivityRealizationRate: number;
  annualPlatformSpendOverride?: number;
}

export interface DepartmentSummary {
  name: DepartmentName;
  businessFunction: BusinessFunction;
  headcount: number;
  copilotLicenses: number;
  copilotActive: number;
  copilotSpend: number;
  copilotPrompts: number;
  claudeLicenses: number;
  claudeActive: number;
  claudeSpend: number;
  claudeTokens: number;
  totalSpend: number;
  combinedActive: number;
  combinedUtilization: number;
  topPowerUsers: string[];
}