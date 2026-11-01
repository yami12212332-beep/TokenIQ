import { demoClaudeReport, demoChatGPTReport, demoChatGPTUsers, demoUsers } from "./src/services/demoData";
import { computeOverall } from "./src/utils/overall";

const periodKey = "2026-10";
const users = demoUsers("MONTHLY", periodKey);
const gptRows = demoChatGPTUsers("MONTHLY");
const claude = demoClaudeReport(periodKey);
const chatgpt = demoChatGPTReport(periodKey);

const copilotKpis = await fetch(
  "http://127.0.0.1:8001/api/copilot/kpis?period_type=MONTHLY&period_key=2026-10",
).then((r) => r.json() as Promise<{ totalMonthlySpend: number }>);

const providerSpend = {
  copilot: copilotKpis.totalMonthlySpend,
  claude: claude.kpis.reportedCostUsd,
  chatgpt: chatgpt.kpis.reportedCostUsd,
};

const summary = computeOverall(users, gptRows, true, providerSpend);
const byId = Object.fromEntries(summary.platforms.map((p) => [p.id, p.spend]));

console.log("provider tab values:", providerSpend);
console.log("overall card values: ", byId);
console.log(
  "match:",
  (["copilot", "claude", "chatgpt"] as const).every(
    (id) => Math.abs(byId[id] - providerSpend[id]) < 1e-9,
  ),
);
console.log("overall total spend:", summary.totalSpend);
