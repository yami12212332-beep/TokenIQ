import type { UnifiedUser } from '../types/dashboard';

export type PlatformId = 'copilot' | 'claude' | 'chatgpt';

export const PLATFORM_META: Record<PlatformId, { name: string; color: string }> = {
  copilot: { name: 'Copilot', color: '#0284c7' },
  claude: { name: 'Claude', color: '#ea580c' },
  chatgpt: { name: 'ChatGPT', color: '#10a37f' },
};

/** One ChatGPT user for the selected period (from /api/overall/chatgpt-users or the sample stub). */
export interface OverallChatGPTRow {
  email: string;
  displayName: string;
  tokens: number;
  requests: number;
  tokenCostUsd: number;
  seatCostUsd: number;
}

export interface OverallRow {
  key: string;
  name: string;
  email: string;
  department: string;
  licensed: PlatformId[];
  active: PlatformId[];
  copilotSpend: number;
  claudeSpend: number;
  chatgptSpend: number;
  totalSpend: number;
}

export interface PlatformSummary {
  id: PlatformId;
  name: string;
  color: string;
  licensed: number;
  active: number;
  spend: number;
  volume: number;
  volumeLabel: string;
}

export interface OverallSummary {
  totalSpend: number;
  employeesInScope: number;
  usersAnyPlatform: number;
  activeAnyPlatform: number;
  multiPlatform: number;
  avgSpendPerUser: number;
  platforms: PlatformSummary[];
  combos: Array<{ name: string; count: number; color: string }>;
  departments: Array<{ department: string; copilot: number; claude: number; chatgpt: number; total: number }>;
  allUsers: OverallRow[];
  topUsers: OverallRow[];
}

const UNMAPPED_DEPT = 'External / Unmapped';

export const buildOverallRows = (users: UnifiedUser[], chatgpt: OverallChatGPTRow[]): OverallRow[] => {
  const gptByEmail = new Map(chatgpt.map((r) => [r.email.toLowerCase(), r]));
  const used = new Set<string>();

  const rows: OverallRow[] = users.map((u) => {
    const email = (u.employee.email || '').toLowerCase();
    const gpt = gptByEmail.get(email);
    if (gpt) used.add(email);

    const licensed: PlatformId[] = [];
    const active: PlatformId[] = [];
    if (u.copilot?.licensed) {
      licensed.push('copilot');
      if (u.copilot.status === 'Active') active.push('copilot');
    }
    if (u.claude?.licensed) {
      licensed.push('claude');
      active.push('claude'); // Claude users are only listed when they have usage
    }
    if (gpt) {
      licensed.push('chatgpt');
      active.push('chatgpt');
    }

    const copilotSpend = u.copilot?.seatCost || 0;
    const claudeSpend = u.claude?.totalMonthlyCost || 0;
    const chatgptSpend = gpt ? gpt.tokenCostUsd : 0;
    return {
      key: u.employee.id || email,
      name: u.employee.name,
      email,
      department: u.employee.department || 'Unassigned',
      licensed,
      active,
      copilotSpend,
      claudeSpend,
      chatgptSpend,
      totalSpend: copilotSpend + claudeSpend + chatgptSpend,
    };
  });

  return rows;
};

export const appendUnmappedChatGPT = (rows: OverallRow[], chatgpt: OverallChatGPTRow[]): OverallRow[] => {
  const known = new Set(rows.map((r) => r.email));
  const extra: OverallRow[] = chatgpt
    .filter((g) => !known.has(g.email.toLowerCase()))
    .map((g) => {
      const spend = g.tokenCostUsd;
      return {
        key: `ext-${g.email}`,
        name: g.displayName || g.email,
        email: g.email.toLowerCase(),
        department: UNMAPPED_DEPT,
        licensed: ['chatgpt'] as PlatformId[],
        active: ['chatgpt'] as PlatformId[],
        copilotSpend: 0,
        claudeSpend: 0,
        chatgptSpend: spend,
        totalSpend: spend,
      };
    });
  return [...rows, ...extra];
};

export const computeOverall = (
  users: UnifiedUser[],
  chatgpt: OverallChatGPTRow[],
  includeUnmapped: boolean,
  authoritativeSpend?: Partial<Record<PlatformId, number>>,
): OverallSummary => {
  let rows = buildOverallRows(users, chatgpt);
  if (includeUnmapped) rows = appendUnmappedChatGPT(rows, chatgpt);

  // Provider tabs are the source of truth for platform spend. Scale the per-user
  // allocations proportionally so Overall totals and breakdowns use the same totals.
  const spendField: Record<PlatformId, 'copilotSpend' | 'claudeSpend' | 'chatgptSpend'> = {
    copilot: 'copilotSpend', claude: 'claudeSpend', chatgpt: 'chatgptSpend',
  };
  for (const id of ['copilot', 'claude', 'chatgpt'] as PlatformId[]) {
    const target = authoritativeSpend?.[id];
    if (typeof target !== 'number' || !Number.isFinite(target)) continue;
    const field = spendField[id];
    const current = rows.reduce((sum, row) => sum + row[field], 0);
    if (current > 0) {
      const factor = target / current;
      rows = rows.map((row) => {
        const updated = { ...row, [field]: row[field] * factor };
        updated.totalSpend = updated.copilotSpend + updated.claudeSpend + updated.chatgptSpend;
        return updated;
      });
    } else if (target > 0) {
      // If provider analytics has a total but the joined user rows have no
      // cost allocation, keep the provider total authoritative. Do not invent
      // a per-user split; the summary card remains accurate while allocations
      // remain unavailable until the provider supplies user-level costs.
    }
  }

  const withAny = rows.filter((r) => r.licensed.length > 0);
  const platforms: PlatformSummary[] = (['copilot', 'claude', 'chatgpt'] as PlatformId[]).map((id) => {
    const licensed = rows.filter((r) => r.licensed.includes(id)).length;
    const active = rows.filter((r) => r.active.includes(id)).length;
    const allocatedSpend = rows.reduce(
      (s, r) => s + (id === 'copilot' ? r.copilotSpend : id === 'claude' ? r.claudeSpend : r.chatgptSpend),
      0,
    );
    const spend = typeof authoritativeSpend?.[id] === 'number' ? authoritativeSpend[id]! : allocatedSpend;
    let volume = 0;
    if (id === 'copilot') volume = users.reduce((s, u) => s + (u.copilot?.promptsTotal || 0), 0);
    if (id === 'claude') volume = users.reduce((s, u) => s + (u.claude?.totalTokens || 0), 0);
    if (id === 'chatgpt') volume = chatgpt.reduce((s, g) => s + g.tokens, 0);
    return {
      id,
      ...PLATFORM_META[id],
      licensed,
      active,
      spend,
      volume,
      volumeLabel: id === 'copilot' ? 'prompts' : 'tokens',
    };
  });

  const totalSpend = platforms.reduce((s, p) => s + p.spend, 0);
  const multi = withAny.filter((r) => r.licensed.length >= 2).length;

  const only = (id: PlatformId) => withAny.filter((r) => r.licensed.length === 1 && r.licensed[0] === id).length;
  const combos = [
    { name: 'All 3 platforms', count: withAny.filter((r) => r.licensed.length === 3).length, color: '#4f46e5' },
    { name: 'Two platforms', count: withAny.filter((r) => r.licensed.length === 2).length, color: '#a78bfa' },
    { name: 'Copilot only', count: only('copilot'), color: PLATFORM_META.copilot.color },
    { name: 'Claude only', count: only('claude'), color: PLATFORM_META.claude.color },
    { name: 'ChatGPT only', count: only('chatgpt'), color: PLATFORM_META.chatgpt.color },
  ].filter((c) => c.count > 0);

  const deptMap = new Map<string, { department: string; copilot: number; claude: number; chatgpt: number; total: number }>();
  for (const r of rows) {
    if (r.totalSpend <= 0) continue;
    const d = deptMap.get(r.department) ?? { department: r.department, copilot: 0, claude: 0, chatgpt: 0, total: 0 };
    d.copilot += r.copilotSpend;
    d.claude += r.claudeSpend;
    d.chatgpt += r.chatgptSpend;
    d.total += r.totalSpend;
    deptMap.set(r.department, d);
  }

  return {
    totalSpend,
    employeesInScope: users.length,
    usersAnyPlatform: withAny.length,
    activeAnyPlatform: rows.filter((r) => r.active.length > 0).length,
    multiPlatform: multi,
    avgSpendPerUser: withAny.length ? totalSpend / withAny.length : 0,
    platforms,
    combos,
    departments: [...deptMap.values()].sort((a, b) => b.total - a.total),
    allUsers: rows,
    topUsers: [...rows].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 10),
  };
};

/**
 * Sample ChatGPT data, used ONLY until /api/overall/chatgpt-users has real tables behind it.
 * Deterministic: about half of the employees get a row, plus one external contractor.
 */
export const buildChatGPTStub = (users: UnifiedUser[], weekly: boolean): OverallChatGPTRow[] => {
  const mult = weekly ? 0.25 : 1;
  const rows: OverallChatGPTRow[] = [];
  users.forEach((u, i) => {
    if (!u.employee.email || (i * 7 + 3) % 2 !== 0) return;
    const tier = (i * 37) % 10; // 0-9
    const tokens = Math.round((tier < 2 ? 1_400_000 : tier < 6 ? 420_000 : 90_000) * (0.7 + ((i * 13) % 7) / 10) * mult);
    rows.push({
      email: u.employee.email,
      displayName: u.employee.name,
      tokens,
      requests: Math.round(tokens / 4200),
      tokenCostUsd: Math.round((tokens / 1_000_000) * 6.5 * 100) / 100,
      seatCostUsd: 0,
    });
  });
  rows.push({
    email: 'sample.contractor@external.example',
    displayName: 'Sample Contractor',
    tokens: Math.round(300_000 * mult),
    requests: Math.round(70 * mult),
    tokenCostUsd: Math.round(1.95 * mult * 100) / 100,
    seatCostUsd: 0,
  });
  return rows;
};
