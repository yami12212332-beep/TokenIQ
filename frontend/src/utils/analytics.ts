import { 
  UnifiedUser, 
  PlatformKPIs, 
  OverallKPIs, 
  DepartmentSummary, 
  ManagerSummary,
  RoiParameters, 
  DepartmentName, 
  BusinessFunction 
} from '../types/dashboard';

export const formatUSD = (amount: number, digits = 0): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount || 0);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(Math.round(num || 0));
};

export const formatTokens = (tokens: number): string => {
  if (tokens >= 1_000_000_000) {
    return `${(tokens / 1_000_000_000).toFixed(2)}B`;
  }
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(0)}k`;
  }
  return formatNumber(tokens);
};

export const formatPercent = (pct: number, digits = 1): string => {
  return `${(pct || 0).toFixed(digits)}%`;
};

export const calculateUtilization = (active: number, total: number): number => {
  if (!total || total <= 0) return 0;
  return Math.round((active / total) * 1000) / 10;
};

export const calculatePowerScore = (user: UnifiedUser): number => {
  let score = 0;
  if (user.copilot && user.copilot.licensed) {
    if (user.copilot.status === 'Active') {
      score += 25;
      score += Math.min(25, user.copilot.appsUsedCount * 4.5);
      score += Math.min(25, (user.copilot.promptsTotal / 250) * 25);
    }
  }
  if (user.claude && user.claude.licensed) {
    if (user.claude.status === 'Active') {
      score += 25;
      score += Math.min(25, (user.claude.totalTokens / 800_000) * 25);
      score += Math.min(25, (user.claude.requestCount / 180) * 25);
    }
  }
  return Math.min(100, Math.round(score));
};

/** Fills the fields the API leaves to the client: powerScore (0-100, see calculatePowerScore). */
export const applyDerivedMetrics = (user: UnifiedUser): UnifiedUser => ({
  ...user,
  powerScore: calculatePowerScore(user),
});

export const calculateCopilotKPIs = (users: UnifiedUser[]): PlatformKPIs => {
  const licensedUsers = users.filter((u) => u.copilot && u.copilot.licensed);
  const activeUsers = licensedUsers.filter((u) => u.copilot?.status === 'Active');
  const wauUsers = licensedUsers.filter((u) => (u.copilot?.daysSinceActive ?? 999) <= 7);
  const never = licensedUsers.filter((u) => u.copilot?.status === 'Never used');

  const totalMonthlySpend = licensedUsers.reduce((sum, u) => sum + (u.copilot?.seatCost || 30), 0);
  const totalVolume = licensedUsers.reduce((sum, u) => sum + (u.copilot?.promptsTotal || 0), 0);
  const activeCount = activeUsers.length;
  const licCount = licensedUsers.length;

  return {
    licensedUsers: licCount,
    activeUsers28d: activeCount,
    weeklyActiveUsers: wauUsers.length,
    utilizationRate: calculateUtilization(activeCount, licCount),
    idleUsersCount: licCount - activeCount,
    neverUsedCount: never.length,
    totalMonthlySpend,
    avgSpendPerActiveUser: activeCount > 0 ? totalMonthlySpend / activeCount : 0,
    totalVolume,
    avgVolumePerActive: activeCount > 0 ? Math.round(totalVolume / activeCount) : 0,
    purchasedSeats: licCount, // no separate purchase data: seats = licensed users
  };
};

export const calculateClaudeKPIs = (users: UnifiedUser[]): PlatformKPIs => {
  const tokenUsers = users.filter((u) => u.claude && u.claude.licensed);
  const activeUsers = tokenUsers.filter((u) => u.claude?.status === 'Active');
  const wauUsers = tokenUsers.filter((u) => (u.claude?.daysSinceActive ?? 999) <= 7);

  const totalMonthlySpend = tokenUsers.reduce((sum, u) => sum + (u.claude?.totalMonthlyCost || 0), 0);
  const totalVolume = tokenUsers.reduce((sum, u) => sum + (u.claude?.totalTokens || 0), 0);
  const activeCount = activeUsers.length;
  const userCount = tokenUsers.length;

  return {
    licensedUsers: userCount,
    activeUsers28d: activeCount,
    weeklyActiveUsers: wauUsers.length,
    utilizationRate: userCount > 0 ? Math.round((activeCount / userCount) * 1000) / 10 : 100.0,
    idleUsersCount: 0,
    neverUsedCount: 0,
    totalMonthlySpend,
    avgSpendPerActiveUser: activeCount > 0 ? Math.round((totalMonthlySpend / activeCount) * 100) / 100 : 0,
    totalVolume,
    avgVolumePerActive: activeCount > 0 ? Math.round(totalVolume / activeCount) : 0,
    purchasedSeats: userCount,
    rosterRestricted: true,
    telemetrySource: 'Anthropic Analytics Telemetry (Active Consumers)'
  };
};

export const calculateOverallKPIs = (users: UnifiedUser[]): OverallKPIs => {
  const licensed = users.filter((u) => (u.copilot?.licensed || u.claude?.licensed));
  const both = licensed.filter((u) => u.copilot?.licensed && u.claude?.licensed);
  const copilotOnly = licensed.filter((u) => u.copilot?.licensed && !u.claude?.licensed);
  const claudeOnly = licensed.filter((u) => !u.copilot?.licensed && u.claude?.licensed);

  const activeAny = licensed.filter(
    (u) => (u.copilot?.status === 'Active') || (u.claude?.status === 'Active')
  );

  const copilotSpend = users.reduce((sum, u) => sum + (u.copilot?.seatCost || 0), 0);
  const claudeSpend = users.reduce((sum, u) => sum + (u.claude?.totalMonthlyCost || 0), 0);
  const combinedMonthlySpend = copilotSpend + claudeSpend;

  // Reclaim savings: Copilot inactive seats ($30/mo) + Claude base seats ($35/mo avg) for users with zero activity > 28d
  const copilotReclaim = users.reduce((sum, u) => {
    if (u.copilot?.licensed && u.copilot.status !== 'Active') {
      return sum + u.copilot.seatCost;
    }
    return sum;
  }, 0);

  const claudeReclaim = users.reduce((sum, u) => {
    if (u.claude?.licensed && u.claude.status !== 'Active') {
      return sum + u.claude.seatCost;
    }
    return sum;
  }, 0);

  const totalLicensedSeats = 
    users.filter((u) => u.copilot?.licensed).length + 
    users.filter((u) => u.claude?.licensed).length;

  const totalUniqueEmployeesLicensed = licensed.length;
  const combinedUtilizationRate = calculateUtilization(activeAny.length, totalUniqueEmployeesLicensed);

  // ROI estimation baseline: 3.2 hours/week saved per active user @ $75/hr blended wage, 4.33 weeks/mo
  const activeCount = activeAny.length;
  const estimatedHoursSavedMonthly = Math.round(activeCount * 3.2 * 4.33);
  const estimatedMonthlyValueAdded = Math.round(estimatedHoursSavedMonthly * 75 * 0.70);

  return {
    totalLicensedSeats,
    totalUniqueEmployeesLicensed,
    bothPlatformsCount: both.length,
    copilotOnlyCount: copilotOnly.length,
    claudeOnlyCount: claudeOnly.length,
    combinedActiveUsers: activeCount,
    combinedMonthlySpend,
    copilotSpend,
    claudeSpend,
    combinedUtilizationRate,
    potentialReclaimMonthlySavings: copilotReclaim + claudeReclaim,
    estimatedHoursSavedMonthly,
    estimatedMonthlyValueAdded,
  };
};

export const calculateDepartmentSummaries = (users: UnifiedUser[]): DepartmentSummary[] => {
  const deptMap = new Map<DepartmentName, {
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
    users: UnifiedUser[];
  }>();

  for (const u of users) {
    const dept = u.employee.department;
    if (!deptMap.has(dept)) {
      deptMap.set(dept, {
        name: dept,
        businessFunction: u.employee.businessFunction,
        headcount: 0,
        copilotLicenses: 0,
        copilotActive: 0,
        copilotSpend: 0,
        copilotPrompts: 0,
        claudeLicenses: 0,
        claudeActive: 0,
        claudeSpend: 0,
        claudeTokens: 0,
        users: [],
      });
    }

    const d = deptMap.get(dept)!;
    d.headcount += 1;
    d.users.push(u);

    if (u.copilot?.licensed) {
      d.copilotLicenses += 1;
      d.copilotSpend += u.copilot.seatCost;
      d.copilotPrompts += u.copilot.promptsTotal;
      if (u.copilot.status === 'Active') {
        d.copilotActive += 1;
      }
    }

    if (u.claude?.licensed) {
      d.claudeLicenses += 1;
      d.claudeSpend += u.claude.totalMonthlyCost;
      d.claudeTokens += u.claude.totalTokens;
      if (u.claude.status === 'Active') {
        d.claudeActive += 1;
      }
    }
  }

  const results: DepartmentSummary[] = [];

  for (const [, val] of deptMap.entries()) {
    const totalSpend = val.copilotSpend + val.claudeSpend;
    const combinedActive = val.users.filter(
      (u) => u.copilot?.status === 'Active' || u.claude?.status === 'Active'
    ).length;
    const combinedLicenses = val.users.filter(
      (u) => u.copilot?.licensed || u.claude?.licensed
    ).length;

    const sortedUsers = [...val.users].sort((a, b) => b.powerScore - a.powerScore);
    const topPowerUsers = sortedUsers.slice(0, 3).map((u) => u.employee.name);

    results.push({
      name: val.name,
      businessFunction: val.businessFunction,
      headcount: val.headcount,
      copilotLicenses: val.copilotLicenses,
      copilotActive: val.copilotActive,
      copilotSpend: val.copilotSpend,
      copilotPrompts: val.copilotPrompts,
      claudeLicenses: val.claudeLicenses,
      claudeActive: val.claudeActive,
      claudeSpend: val.claudeSpend,
      claudeTokens: val.claudeTokens,
      totalSpend,
      combinedActive,
      combinedUtilization: calculateUtilization(combinedActive, combinedLicenses),
      topPowerUsers,
    });
  }

  return results.sort((a, b) => b.totalSpend - a.totalSpend);
};

export const calculateROI = (
  activeUsersCount: number,
  monthlySpend: number,
  params: RoiParameters
) => {
  const weeksPerMonth = 4.33;
  const hoursSavedPerMonth = activeUsersCount * params.hoursSavedPerWeekPerActiveUser * weeksPerMonth;
  const grossMonthlyValue = hoursSavedPerMonth * params.blendedHourlyWage * (params.productivityRealizationRate / 100);
  const netMonthlyValue = grossMonthlyValue - monthlySpend;
  const roiPercentage = monthlySpend > 0 ? (netMonthlyValue / monthlySpend) * 100 : 0;
  const annualizedSpend = monthlySpend * 12;
  const annualizedNetValue = netMonthlyValue * 12;

  return {
    hoursSavedPerMonth: Math.round(hoursSavedPerMonth),
    grossMonthlyValue: Math.round(grossMonthlyValue),
    netMonthlyValue: Math.round(netMonthlyValue),
    roiPercentage: Math.round(roiPercentage),
    annualizedSpend: Math.round(annualizedSpend),
    annualizedNetValue: Math.round(annualizedNetValue),
  };
};

const UNASSIGNED = 'Unassigned';

/** Group users into manager summaries using a caller-supplied grouping key. */
const buildManagerSummaries = (
  users: UnifiedUser[],
  groupOf: (u: UnifiedUser) => { key: string; name: string; userName: string },
): ManagerSummary[] => {
  const managerMap = new Map<string, {
    managerId: string;
    managerName: string;
    managerUserName: string;
    department: string;
    division?: string;
    directReportsCount: number;
    copilotLicensed: number;
    copilotActive: number;
    copilotSpend: number;
    copilotPrompts: number;
    claudeActive: number;
    claudeSpend: number;
    claudeTokens: number;
    reclaimPotentialSpend: number;
    users: UnifiedUser[];
  }>();

  for (const u of users) {
    const { key, name: mgrName, userName: mgrUser } = groupOf(u);

    if (!managerMap.has(key)) {
      managerMap.set(key, {
        managerId: key,
        managerName: mgrName,
        managerUserName: mgrUser,
        department: u.employee.department,
        division: u.employee.division || u.employee.businessFunction,
        directReportsCount: 0,
        copilotLicensed: 0,
        copilotActive: 0,
        copilotSpend: 0,
        copilotPrompts: 0,
        claudeActive: 0,
        claudeSpend: 0,
        claudeTokens: 0,
        reclaimPotentialSpend: 0,
        users: []
      });
    }

    const m = managerMap.get(key)!;
    m.directReportsCount += 1;
    m.users.push(u);

    if (u.copilot?.licensed) {
      m.copilotLicensed += 1;
      m.copilotSpend += u.copilot.seatCost;
      m.copilotPrompts += u.copilot.promptsTotal;
      if (u.copilot.status === 'Active') {
        m.copilotActive += 1;
      } else {
        m.reclaimPotentialSpend += u.copilot.seatCost;
      }
    }

    if (u.claude?.licensed) {
      if (u.claude.status === 'Active') {
        m.claudeActive += 1;
      }
      m.claudeSpend += u.claude.totalMonthlyCost;
      m.claudeTokens += u.claude.totalTokens;
    }
  }

  const results: ManagerSummary[] = [];

  for (const [, val] of managerMap.entries()) {
    const totalTeamSpend = val.copilotSpend + val.claudeSpend;
    const combinedActive = val.users.filter(
      (u) => u.copilot?.status === 'Active' || u.claude?.status === 'Active'
    ).length;
    const combinedLicenses = val.users.filter(
      (u) => u.copilot?.licensed || u.claude?.licensed
    ).length;

    const sortedUsers = [...val.users].sort((a, b) => b.powerScore - a.powerScore);
    const topTeamMembers = sortedUsers.slice(0, 3).map((u) => u.employee.name);

    results.push({
      managerId: val.managerId,
      managerName: val.managerName,
      managerUserName: val.managerUserName,
      department: val.department,
      division: val.division,
      directReportsCount: val.directReportsCount,
      totalTeamSpend: parseFloat(totalTeamSpend.toFixed(2)),
      copilotLicensed: val.copilotLicensed,
      copilotActive: val.copilotActive,
      copilotSpend: parseFloat(val.copilotSpend.toFixed(2)),
      copilotPrompts: val.copilotPrompts,
      claudeActive: val.claudeActive,
      claudeSpend: parseFloat(val.claudeSpend.toFixed(2)),
      claudeTokens: val.claudeTokens,
      utilizationRate: calculateUtilization(combinedActive, combinedLicenses),
      reclaimPotentialSpend: parseFloat(val.reclaimPotentialSpend.toFixed(2)),
      topTeamMembers
    });
  }

  return results.sort((a, b) => b.directReportsCount - a.directReportsCount);
};

/** Group by the employee's direct manager (Workday manager name). */
export const calculateManagerSummaries = (users: UnifiedUser[]): ManagerSummary[] =>
  buildManagerSummaries(users, (u) => {
    const name = u.employee.managerName || UNASSIGNED;
    return { key: name, name, userName: u.employee.managerUserName || name.toLowerCase().replace(/[^a-z]/g, '') };
  });

/** Key used to group (and filter) users under an EVP: Workday manager_level_3_user_id. */
export const getEvpKey = (u: UnifiedUser): string =>
  (u.employee.managerLevel3UserId || '').trim() || UNASSIGNED;

/** Group by EVP, i.e. manager_level_3_user_id. Users with no level-3 manager fall into "Unassigned". */
export const calculateEvpSummaries = (users: UnifiedUser[]): ManagerSummary[] =>
  buildManagerSummaries(users, (u) => {
    const key = getEvpKey(u);
    const name = key === UNASSIGNED ? UNASSIGNED : (u.employee.managerLevel3UserName || key);
    return { key, name, userName: key };
  });