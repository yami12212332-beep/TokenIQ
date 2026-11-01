import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  formatUSD, 
  formatTokens, 
  calculateUtilization, 
  calculatePowerScore, 
  applyDerivedMetrics,
  calculateROI,
  calculateOverallKPIs,
  calculateDepartmentSummaries,
  calculateManagerSummaries,
  calculateEvpSummaries
} from './analytics';
import { UnifiedUser } from '../types/dashboard';

test('formatUSD formats currency without decimals by default', () => {
  assert.equal(formatUSD(1250), '$1,250');
  assert.equal(formatUSD(0), '$0');
});

test('formatTokens abbreviates large numbers', () => {
  assert.equal(formatTokens(1_500_000_000), '1.50B');
  assert.equal(formatTokens(24_800_000), '24.8M');
  assert.equal(formatTokens(450_000), '450k');
  assert.equal(formatTokens(850), '850');
});

test('calculateUtilization calculates accurate percentages with safe 0 division', () => {
  assert.equal(calculateUtilization(50, 100), 50.0);
  assert.equal(calculateUtilization(33, 99), 33.3);
  assert.equal(calculateUtilization(0, 100), 0.0);
  assert.equal(calculateUtilization(10, 0), 0.0);
});

test('calculateROI calculates gross value, net profit, and ROI % correctly', () => {
  const result = calculateROI(100, 3000, {
    hoursSavedPerWeekPerActiveUser: 4,
    blendedHourlyWage: 75,
    productivityRealizationRate: 70
  });

  // 100 users * 4 hrs * 4.33 weeks = 1732 hours
  assert.equal(result.hoursSavedPerMonth, 1732);
  // 1732 hrs * $75/hr * 0.70 = 90930
  assert.equal(result.grossMonthlyValue, 90930);
  // 90930 - 3000 = 87930
  assert.equal(result.netMonthlyValue, 87930);
  // (87930 / 3000) * 100 = 2931%
  assert.equal(result.roiPercentage, 2931);
});

test('calculatePowerScore handles active and inactive states across platforms', () => {
  const activeUser: UnifiedUser = {
    employee: {
      id: 'EMP-1',
      name: 'Alice Dev',
      email: 'alice@corp.com',
      department: 'Engineering',
      businessFunction: 'Core Tech',
      title: 'Senior Engineer',
      managerName: 'Bob Lead'
    },
    platforms: 'both',
    totalSpend: 75,
    primarySegment: 'Power',
    isMultiPlatform: true,
    powerScore: 0,
    copilot: {
      reportDate: '2026-10-20',
      periodKey: '2026-10',
      periodType: 'MONTHLY',
      licensed: true,
      seatCost: 30,
      status: 'Active',
      segment: 'Power',
      lastActiveDate: '2026-10-20',
      daysSinceActive: 0,
      promptsTotal: 280,
      promptsWork: 200,
      promptsWeb: 80,
      activeDaysCount: 18,
      appsUsedCount: 5,
      apps: { chat: true, teams: true, word: true, excel: true, powerpoint: true, onenote: false }
    },
    claude: {
      reportDate: '2026-10-20',
      periodKey: '2026-10',
      periodType: 'MONTHLY',
      licensed: true,
      licenseTier: 'Enterprise',
      seatCost: 40,
      tokenCostUsd: 25.5,
      totalMonthlyCost: 65.5,
      status: 'Active',
      segment: 'Power',
      lastActiveDate: '2026-10-20',
      daysSinceActive: 0,
      totalTokens: 950_000,
      inputTokens: 600_000,
      outputTokens: 250_000,
      cacheReadTokens: 75_000,
      cacheCreationTokens: 25_000,
      requestCount: 210,
      activeDaysCount: 15,
      favoriteModel: 'claude-3-7-sonnet',
      modelBreakdown: {
        'claude-3-7-sonnet': { tokens: 700000, cost: 20 },
        'claude-3-5-sonnet': { tokens: 200000, cost: 4 },
        'claude-3-5-haiku': { tokens: 50000, cost: 1.5 },
        'claude-3-opus': { tokens: 0, cost: 0 }
      }
    }
  };

  const score = calculatePowerScore(activeUser);
  assert.ok(score >= 80, `Expected score >= 80, got ${score}`);
});

test('calculateManagerSummaries groups users by Workday manager and aggregates metrics', () => {
  const users: UnifiedUser[] = [
    {
      employee: {
        id: 'WD-101',
        name: 'Alex Developer',
        email: 'alex@corp.com',
        department: 'Engineering',
        businessFunction: 'Core Tech',
        title: 'Backend Engineer',
        managerName: 'Sarah Jenkins',
        managerUserName: 'sjenkins'
      },
      platforms: 'copilot',
      totalSpend: 30,
      primarySegment: 'Regular',
      isMultiPlatform: false,
      powerScore: 60,
      copilot: {
        reportDate: '2026-10-20',
        periodKey: '2026-10',
        periodType: 'MONTHLY',
        licensed: true,
        seatCost: 30,
        status: 'Active',
        segment: 'Regular',
        lastActiveDate: '2026-10-20',
        daysSinceActive: 0,
        promptsTotal: 120,
        promptsWork: 80,
        promptsWeb: 40,
        activeDaysCount: 14,
        appsUsedCount: 3,
        apps: { chat: true, teams: true, word: true, excel: false, powerpoint: false, onenote: false }
      }
    },
    {
      employee: {
        id: 'WD-102',
        name: 'Jordan Engineer',
        email: 'jordan@corp.com',
        department: 'Engineering',
        businessFunction: 'Core Tech',
        title: 'Frontend Engineer',
        managerName: 'Sarah Jenkins',
        managerUserName: 'sjenkins'
      },
      platforms: 'claude',
      totalSpend: 55,
      primarySegment: 'Power',
      isMultiPlatform: false,
      powerScore: 75,
      claude: {
        reportDate: '2026-10-20',
        periodKey: '2026-10',
        periodType: 'MONTHLY',
        licensed: true,
        licenseTier: 'Enterprise',
        seatCost: 40,
        tokenCostUsd: 15,
        totalMonthlyCost: 55,
        status: 'Active',
        segment: 'Power',
        lastActiveDate: '2026-10-20',
        daysSinceActive: 0,
        totalTokens: 500_000,
        inputTokens: 300_000,
        outputTokens: 200_000,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        requestCount: 90,
        activeDaysCount: 12,
        favoriteModel: 'claude-3-7-sonnet',
        modelBreakdown: {
          'claude-3-7-sonnet': { tokens: 500000, cost: 15 },
          'claude-3-5-sonnet': { tokens: 0, cost: 0 },
          'claude-3-5-haiku': { tokens: 0, cost: 0 },
          'claude-3-opus': { tokens: 0, cost: 0 }
        }
      }
    }
  ];

  const summaries = calculateManagerSummaries(users);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].managerName, 'Sarah Jenkins');
  assert.equal(summaries[0].directReportsCount, 2);
  assert.equal(summaries[0].totalTeamSpend, 85);
  assert.equal(summaries[0].copilotActive, 1);
  assert.equal(summaries[0].claudeActive, 1);
  assert.equal(summaries[0].claudeTokens, 500000);
  assert.equal(summaries[0].copilotPrompts, 120);
});


test('applyDerivedMetrics fills powerScore for active users and gives 0 for inactive', () => {
  const base = {
    employee: { id: '1', name: 'A', email: 'a@x.com', department: 'Engineering', businessFunction: 'Core Tech', title: 'Eng', managerName: 'M' },
    platforms: 'copilot', totalSpend: 30, primarySegment: 'Power', isMultiPlatform: false, powerScore: 0,
  } as unknown as UnifiedUser;
  const copilot = (status: 'Active' | 'Never used', prompts: number, apps: number) => ({
    licensed: true, seatCost: 30, status, segment: 'Power', daysSinceActive: 2, promptsTotal: prompts, appsUsedCount: apps,
  }) as unknown as UnifiedUser['copilot'];

  // Active: 25 (active) + min(25, 4*4.5=18) + min(25, 250/250*25=25) = 68
  const active = applyDerivedMetrics({ ...base, copilot: copilot('Active', 250, 4) });
  assert.equal(active.powerScore, 68);

  const idle = applyDerivedMetrics({ ...base, copilot: copilot('Never used', 0, 0) });
  assert.equal(idle.powerScore, 0);
});


test('calculateEvpSummaries groups users by manager_level_3_user_id', () => {
  const mk = (id: string, mgr: string, l3: string | null, l3Name: string | null): UnifiedUser => ({
    employee: { id, name: id, email: `${id}@x.com`, department: 'Engineering', businessFunction: 'Core Tech', title: 'Eng',
      managerName: mgr, managerLevel3UserId: l3, managerLevel3UserName: l3Name },
    platforms: 'copilot', totalSpend: 30, primarySegment: 'Regular', isMultiPlatform: false, powerScore: 0,
    copilot: { reportDate: '2026-10-20', periodKey: '2026-10', periodType: 'MONTHLY', licensed: true, seatCost: 30,
      status: 'Active', segment: 'Regular', lastActiveDate: null, daysSinceActive: 0, promptsTotal: 10, promptsWork: 5,
      promptsWeb: 5, activeDaysCount: 3, appsUsedCount: 1, apps: {} },
  } as unknown as UnifiedUser);

  // Different direct managers, same level-3 EVP -> one group
  const users = [mk('a', 'Mgr One', 'evp1', 'Eve P'), mk('b', 'Mgr Two', 'evp1', 'Eve P'), mk('c', 'Mgr Three', 'evp2', 'Sam Q'), mk('d', 'Mgr Four', null, null)];
  const out = calculateEvpSummaries(users);
  const byId = Object.fromEntries(out.map((m) => [m.managerId, m]));
  assert.equal(out.length, 3);
  assert.equal(byId['evp1'].managerName, 'Eve P');
  assert.equal(byId['evp1'].copilotLicensed, 2);
  assert.equal(byId['evp2'].copilotLicensed, 1);
  assert.equal(byId['Unassigned'].managerName, 'Unassigned');
});