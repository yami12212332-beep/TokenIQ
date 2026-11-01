# Claude Enterprise billing: seat fee + token usage

**Checked:** 2026-11-01
**Scope:** TokenIQ Claude cost model (`CLAUDE_BASE_SEAT_PRICE`, Claude tab spend, user modal)
**Status:** Applied — seat price set to **$20**; remaining decisions below

---

## TL;DR

Claude Enterprise is **not** token-only. Anthropic bills it as:

1. A **fixed seat fee** per user per month, billed annually.
2. **Usage on top of that**, at standard API token rates.

The current public Enterprise price is **US$20 / seat / month**, billed annually with a
**20-seat minimum**. The seat fee covers platform access only; it includes **no token
usage**. Every token used in Claude, Claude Code, or Cowork is billed separately at API
rates.

TokenIQ previously assumed **$40 / seat / month**. That has been corrected to **$20**
in the local configuration and defaults.

---

## Official Anthropic pricing

| Item | Detail |
| --- | --- |
| Enterprise seat | **US$20 / seat / month** |
| Billing cycle | Annual |
| Minimum seats | **20** |
| Seat includes | Claude web, desktop, mobile, Claude Code, Cowork |
| Seat excludes | All token usage |
| Usage | Billed separately at standard API rates |

Anthropic’s support documentation states:

> “Enterprise plan billing has two parts: a fixed seat fee and separate usage charges.
> The seat fee covers platform access. Usage is billed on top of that, based on what
> your team actually consumes.”

> “Every token your team consumes is billed separately at standard API rates.”

The pricing page describes Enterprise as:

> “Seat price + usage at API rates. US$20/seat/month, billed annually, 20 seat minimum.
> Usage cost scales with model and task.”

---

## What TokenIQ does now

| Component | Current implementation |
| --- | --- |
| Seat price | `CLAUDE_BASE_SEAT_PRICE=20.0` (`backend/.env`, `.env.example`, `services/database.py` default) |
| Monthly seat cost | `active_users × 20.0` |
| Weekly seat cost | `active_users × 20.0 × 0.25` |
| Token cost | `claude_user_cost_report.amount / 100` (cents → USD) |
| User total | `seatCost + tokenCostUsd` → `totalMonthlyCost` |
| Claude tab “Platform Spend” | **Token cost only** (`reportedCostUsd`) |
| User table “Reported Cost” | **Token cost only** |
| User modal “Claude Monthly Spend” | **Seat + token** |

### Worked example — Arjun Mehta, October 2026

| Component | Before ($40 seat) | After ($20 seat) |
| --- | --- | --- |
| Seat | $40.00 | **$20.00** |
| Token/API cost | $28.36 | $28.36 |
| **Total** | **$68.36** (displayed $68) | **$48.36** (displayed $48) |

`formatUSD` uses zero fraction digits, so the modal displays `$48`.

---

## Change applied

Files updated:

| File | Change |
| --- | --- |
| `backend/.env` | `CLAUDE_BASE_SEAT_PRICE=20.0` |
| `backend/.env.example` | `CLAUDE_BASE_SEAT_PRICE=20.0` |
| `backend/services/database.py` | Default fallback changed from `"40.0"` to `"20.0"` |
| `db/README.md` | Backend example env updated to `20.0` |
| `frontend/src/types/dashboard.ts` | Comment updated from `$40` to `$20` |

Verified after restarting the backend:

| Check | Result |
| --- | --- |
| `/api/claude/kpis` monthly, Oct 2026 | **$602.65** (24 × $20 seat + $122.65 token) |
| `/api/claude/kpis` weekly | **$138.55** (17 × $20 × 0.25 + $53.55 token) |
| Dashboard user — Arjun Mehta | seat **$20.00**, token **$28.36**, total **$48.36** |
| Dashboard Claude users (Oct) | 23 users, seat **$460.00**, token **$120.37** |
| `/api/claude/analytics` token cost | **$122.65** (unchanged; token-only) |

The Claude tab’s “Platform Spend” remains **token-only** and does not include the
$20 seat fee.

---

## Gaps / risks

1. **The 20-seat minimum is not modeled.** The app uses active users as seats. If the
   organization has fewer than 20 Claude seats, the true seat cost is still
   `20 × $20 = $400 / month`, even if only a few users are active.
2. **Active users ≠ purchased seats.** Users with no usage may still hold a seat; the
   app currently counts only reporting users from the usage report.
3. **Claude tab spend is token-only.** “Platform Spend” excludes the seat fee, while
   the user modal includes it. This is inconsistent and should be labelled or aligned.
4. **Legacy Enterprise plans differ.** Older seat-based plans with Standard/Premium
   seats may include usage allowances or use different prices. Check the contract if
   the organization is not on the current single-seat Enterprise plan.
5. **Negotiated pricing may differ.** The $20 figure is the public self-serve price;
   sales-assisted contracts can have custom terms.

---

## Remaining recommended actions

1. **Decide the Claude tab spend definition.**
   - Option A: “Platform Spend” = seat + token (total Claude cost).
   - Option B: keep token-only but relabel it “Token/API Cost”.
2. **Show the breakdown in the user modal:** `Seat $20 + Tokens $28 = $48`.
3. **Model the 20-seat minimum** if the organization has fewer than 20 seats:
   `seat_cost = max(purchased_seats, 20) × seat_price`.
4. **Use purchased seats, not active users, for seat cost** once a roster/licence
   source is available (`claude_organization_users` is currently absent locally).

---

## Sources

- Anthropic pricing — Enterprise:
  <https://www.anthropic.com/pricing>
- “How am I billed for my Enterprise plan?”:
  <https://support.claude.com/en/articles/11526368-how-am-i-billed-for-my-enterprise-plan>
- “What is the Enterprise plan?”:
  <https://support.claude.com/en/articles/9797531-what-is-the-enterprise-plan>
- Claude API token pricing:
  <https://platform.claude.com/docs/en/about-claude/pricing>

---

## Decision checklist

- [x] Confirm the public Claude Enterprise seat price and apply it.
- [ ] Choose whether the Claude tab shows token-only or seat + token spend.
- [ ] Decide whether to model the 20-seat minimum.
- [ ] Decide whether to add the seat/token breakdown to the user modal.
