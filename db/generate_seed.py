"""Generates db/seed.sql: a consistent, deterministic test dataset for TokenIQ.

Usage:  python generate_seed.py seed.sql      (standard library only; same output every run)


Everything is derived from per-user, per-day simulated activity so the tables agree with each other:
  * copilot_usage_user_detail  = per-user aggregates over a rolling 30-day window (D30) at each snapshot
  * copilot_user_count_trend   = per-day counts over the same window, from the same daily activity
  * copilot_user_count_summary = per-snapshot counts, from the same daily activity
  * claude_usage_user_detail        = per-user/day/model rows, fetched weekly (D7, every Friday)
  * claude_cost_user_detail         = cost of each usage row = tokens x published per-model prices
"""
import random, datetime as dt, sys
from collections import defaultdict

OUT = sys.argv[1]
rng = random.Random(20261025)
D = dt.date
SIM_START, SIM_END = D(2026, 7, 29), D(2026, 10, 22)          # daily activity simulated for this range
AS_OF = D(2026, 10, 23)                                        # latest fetch (Friday)
CP_SNAPSHOTS = [D(2026, 8, 28), D(2026, 9, 25), D(2026, 10, 23)]   # Copilot D30 fetches (Fridays)
CLAUDE_FIRST_USAGE = D(2026, 7, 31)                            # first Claude fetch (Aug 7) covers Jul 31 - Aug 6
DOMAIN = "contoso.com"

# ----------------------------------------------------------------------------------------------
# Employees: (name, title, copilot archetype, claude archetype)
# ----------------------------------------------------------------------------------------------
DEPTS = [
 ("Engineering", "Core Tech", "adeshmukh", [
   ("Anita Deshmukh", "EVP, Engineering", "regular", "light", "Mumbai"),
   ("Vikram Rao", "Staff Software Engineer", "power", "power", "Bengaluru"),
   ("Priya Nambiar", "Senior Backend Engineer", "power", "power", "Bengaluru"),
   ("Arjun Mehta", "Frontend Tech Lead", "regular", "power", "Pune"),
   ("Neha Kapoor", "Data Platform Engineer", "regular", "power", "Hyderabad"),
   ("Rohan Iyer", "DevOps Specialist", "regular", "regular", "Bengaluru"),
   ("Sana Qureshi", "QA Architect", "light", "regular", "Pune"),
   ("Tom Becker", "Senior Software Engineer", "light", "regular", "Austin"),
   ("Divya Menon", "Software Engineer II", "never", "light", "Bengaluru"),
   ("Luis Ortega", "Software Engineer I", "dormant", "new", "Austin"),
   ("Harsh Agarwal", "ML Engineer", None, "power", "Hyderabad"),
   ("Meera Pillai", "Site Reliability Engineer", "regular", "idle", "Chennai")]),
 ("Product & Design", "Core Tech", "kmalhotra", [
   ("Karan Malhotra", "EVP, Product & Design", "regular", None, "Mumbai"),
   ("Jessica Lee", "Principal Product Manager", "power", "regular", "New York"),
   ("Ishaan Verma", "Product Designer", "regular", "light", "Bengaluru"),
   ("Olivia Grant", "Design Systems Lead", "regular", None, "New York"),
   ("Aarav Shah", "Technical Writer", "light", "light", "Pune"),
   ("Maya Krishnan", "Product Operations Lead", "light", None, "Chennai"),
   ("Daniel Foster", "UX Researcher", "never", None, "Chicago"),
   ("Zoya Ali", "Product Analyst", None, "regular", "Hyderabad")]),
 ("Sales & Solutions", "Go-To-Market", "mturner", [
   ("Michael Turner", "EVP, Sales", "regular", None, "New York"),
   ("Ananya Das", "Enterprise Account Executive", "power", None, "Mumbai"),
   ("Mark Robinson", "Solutions Architect", "power", None, "Chicago"),
   ("Varun Chopra", "Sales Engineer", "power", "light", "Delhi"),
   ("Emily Carter", "Strategic Account Manager", "regular", None, "New York"),
   ("Rakesh Joshi", "Business Development Rep", "regular", None, "Delhi"),
   ("Nina Patel", "Account Executive", "regular", "regular", "Dallas"),
   ("Chris Walker", "Sales Operations Analyst", "light", None, "Chicago"),
   ("Pooja Reddy", "Inside Sales Rep", "light", None, "Hyderabad"),
   ("Brandon Hughes", "Account Manager", "never", None, "Dallas"),
   ("Kavita Sharma", "Sales Enablement Lead", "dormant", None, "Mumbai")]),
 ("Marketing", "Go-To-Market", "slaurent", [
   ("Sophia Laurent", "EVP, Marketing", "regular", "light", "New York"),
   ("Natalie Brooks", "Content Strategy Lead", "power", "light", "Chicago"),
   ("Rahul Bansal", "Performance Marketing Manager", "regular", "regular", "Bengaluru"),
   ("Hannah Cole", "Brand Manager", "regular", None, "New York"),
   ("Imran Sheikh", "SEO Specialist", "light", None, "Mumbai"),
   ("Grace Kim", "Social Media Manager", "light", "light", "Austin"),
   ("Aditi Rao", "Marketing Analyst", "new", None, "Pune"),
   ("Peter Novak", "Creative Producer", None, "dormant", "Chicago")]),
 ("Customer Support", "Operations", "rnair", [
   ("Rahul Nair", "EVP, Customer Support", "regular", None, "Chennai"),
   ("Siddharth Rane", "Support Team Lead", "regular", None, "Pune"),
   ("Amanda Price", "Senior Support Specialist", "regular", "light", "Dallas"),
   ("Lakshmi Narayan", "Support Specialist", "light", None, "Chennai"),
   ("Jordan Blake", "Support Specialist", "light", None, "Austin"),
   ("Fatima Noor", "Escalations Analyst", "light", None, "Mumbai"),
   ("Greg Dawson", "Support Specialist", "never", None, "Dallas"),
   ("Ritu Saxena", "Quality Analyst", "never", None, "Delhi"),
   ("Sam Whitaker", "Knowledge Base Editor", None, None, "Austin")]),
 ("Finance & Legal", "Corporate & Admin", "erossi", [
   ("Elena Rossi", "EVP, Finance & Legal", "light", "light", "New York"),
   ("Isha Banerjee", "Senior Financial Analyst", "regular", "regular", "Mumbai"),
   ("Pranav Kumar", "FP&A Manager", "regular", None, "Bengaluru"),
   ("Claire Dubois", "Corporate Counsel", "light", None, "New York"),
   ("Anil Gupta", "Procurement Specialist", "light", None, "Delhi"),
   ("Rebecca Stone", "Compliance Analyst", "never", None, "Chicago"),
   ("Tarun Bhatia", "Accounts Payable Lead", None, "idle", "Pune"),
   ("Wendy Chao", "Paralegal", None, None, "New York")]),
]
TERMINATED = [  # left the company on 2026-09-05; still appear in telemetry for August
   ("Dev Malik", "Software Engineer II", "Engineering", "Core Tech", "adeshmukh", "Anita Deshmukh", "regular", "regular", "Pune"),
   ("Julia Weber", "Account Executive", "Sales & Solutions", "Go-To-Market", "mturner", "Michael Turner", "regular", None, "Dallas"),
]
CEO = ("rkulkarni", "Rajesh Kulkarni")
CONTRACTOR = ("Alex Mercer", "alex.mercer@vendorworks.io")   # Claude usage but no Workday record

def uid(name):
    f, l = name.lower().replace("'", "").split()[:2]
    return f[0] + l

class Emp: pass
emps = []
n = 0
for dept, div, evp_uid, rows in DEPTS:
    for i, (name, title, cp, cl, loc) in enumerate(rows):
        e = Emp(); n += 1
        e.name, e.title, e.dept, e.div, e.loc = name, title, dept, div, loc
        e.cp, e.cl = cp, cl
        e.user_id = uid(name); e.status = "Active"
        e.is_evp = (i == 0)
        e.mgr_uid, e.mgr_name = (CEO if e.is_evp else (evp_uid, rows[0][0]))
        e.email = name.lower().replace(" ", ".").replace("'", "") + "@" + DOMAIN
        e.home = name.lower().replace(" ", ".") + str(30 + (n * 7) % 60) + "@gmail.com"
        e.hire = D(2012 + (n * 5) % 13, 1 + (n * 3) % 12, 1 + (n * 11) % 27)
        e.seq = 500000 + n
        e.term = None
        emps.append(e)
for name, title, dept, div, evp_uid, evp_name, cp, cl, loc in TERMINATED:
    e = Emp(); n += 1
    e.name, e.title, e.dept, e.div, e.loc, e.cp, e.cl = name, title, dept, div, loc, cp, cl
    e.user_id = uid(name); e.status = "Terminated"; e.is_evp = False
    e.mgr_uid, e.mgr_name = evp_uid, evp_name
    e.email = name.lower().replace(" ", ".") + "@" + DOMAIN
    e.home = name.lower().replace(" ", ".") + str(30 + (n * 7) % 60) + "@gmail.com"
    e.hire = D(2021, 3, 15); e.seq = 500000 + n; e.term = D(2026, 9, 5)
    emps.append(e)
assert len({e.email for e in emps}) == len(emps)

# ----------------------------------------------------------------------------------------------
# Copilot daily simulation
# ----------------------------------------------------------------------------------------------
CP_APPS = ["chat", "teams", "word", "excel", "powerpoint", "outlook", "onenote", "loop"]   # count as "Copilot activity"
EXTRA = ["edge", "m365app"]                                                                  # not Copilot apps themselves
def daterange(a, b):
    while a <= b:
        yield a; a += dt.timedelta(days=1)

def copilot_profile(arch):
    if arch == "power":
        return dict(p_wd=.93, p_we=.12, pr=(8, 45), apps={"chat": .92, "teams": .6, "word": .5, "excel": .45, "powerpoint": .35, "outlook": .55, "onenote": .12, "loop": .05, "edge": .35, "m365app": .4})
    if arch in ("regular", "new", "dormant"):
        extras = rng.sample(["teams", "word", "excel", "outlook", "powerpoint"], rng.choice([1, 2, 2]))
        a = {"chat": .85}; a.update({x: .4 for x in extras}); a.update({"edge": .12, "m365app": .15})
        return dict(p_wd=.62, p_we=.04, pr=(3, 14), apps=a)
    if arch == "light":
        a = {"chat": .9, "edge": .05}
        if rng.random() < .4: a[rng.choice(["word", "teams"])] = .2
        return dict(p_wd=.16, p_we=.01, pr=(1, 5), apps=a)
    return None

for e in emps:
    e.cp_days = {}                      # date -> dict(prompts, work, web, apps:set)
    e.cp_start = None
    if e.cp is None: continue
    e.cp_start = D(2026, 9, 14) if e.cp == "new" else D(2026, 7, 1)
    e.cp_end = e.term                   # license removed at termination
    prof = copilot_profile(e.cp)
    if not prof: continue
    for d in daterange(SIM_START, SIM_END):
        if d < e.cp_start or (e.term and d >= e.term): continue
        if e.cp == "dormant" and not (D(2026, 8, 3) <= d <= D(2026, 8, 14)): continue
        if e.cp == "new" and d <= e.cp_start: continue
        p = prof["p_wd"] if d.weekday() < 5 else prof["p_we"]
        if rng.random() >= p: continue
        apps = {a for a, pa in prof["apps"].items() if rng.random() < pa}
        if not (apps & set(CP_APPS)): apps.add("chat")
        prompts = rng.randint(*prof["pr"])
        work = web = 0
        if "chat" in apps:
            share = int(prompts * rng.uniform(.4, .7)) or 1
            web = int(share * rng.uniform(0, .3)); work = share - web
        e.cp_days[d] = dict(prompts=prompts, work=work, web=web, apps=apps)

def licensed_on(e, d):
    return e.cp is not None and e.cp_start <= d and not (e.term and d >= e.term)

def window(R):  # D30 report fetched on R covers R-30 .. R-1
    return R - dt.timedelta(days=30), R - dt.timedelta(days=1)

# ----------------------------------------------------------------------------------------------
# Claude daily simulation
# ----------------------------------------------------------------------------------------------
PRICES = {  # USD per million tokens: input, output, cache read, cache creation
  "claude-sonnet-4-5-20250929": (3.00, 15.00, 0.30, 3.75),
  "claude-opus-4-1-20250805":   (15.00, 75.00, 1.50, 18.75),
  "claude-haiku-4-5-20251001":  (1.00, 5.00, 0.10, 1.25),
}
SONNET, OPUS, HAIKU = list(PRICES)
def claude_profile(arch):
    if arch == "power":   return dict(p_wd=.9, p_we=.18, T=(100_000, 300_000), models={SONNET: .95, HAIKU: .5, OPUS: .25})
    if arch in ("regular", "new", "dormant"): return dict(p_wd=.55, p_we=.04, T=(25_000, 70_000), models={SONNET: .8, HAIKU: .4, OPUS: .05})
    if arch == "light":   return dict(p_wd=.15, p_we=.01, T=(8_000, 30_000), models={HAIKU: .7, SONNET: .35})
    return None

def tokens_for(model, T):
    if model == OPUS: T *= .35
    elif model == HAIKU: T *= .8
    w = [rng.uniform(.34, .42), rng.uniform(.08, .12), rng.uniform(.40, .48), rng.uniform(.06, .10)]
    s = sum(w); inp, out, cr, cc = (int(T * x / s) for x in w)
    reqs = max(1, round(T / rng.uniform(3500, 9000)))
    return inp, out, cr, cc, reqs

def rand_id():
    al = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    return "user_01" + "".join(rng.choice(al) for _ in range(22))

class CU: pass     # claude user (employee or contractor)
claude_users = []
def make_cu(name, email, arch, emp=None):
    c = CU(); c.name, c.email, c.arch, c.emp = name, email, arch, emp
    c.user_id = rand_id(); c.rows = []   # (date, model, inp, out, cr, cc, reqs)
    c.start = D(2026, 10, 5) if arch == "new" else CLAUDE_FIRST_USAGE
    prof = claude_profile(arch)
    c.last_dt = None
    if prof:
        for d in daterange(CLAUDE_FIRST_USAGE, SIM_END):
            if d < c.start or (emp is not None and emp.term and d >= emp.term): continue
            if arch == "dormant" and not (D(2026, 8, 3) <= d <= D(2026, 8, 21)): continue
            if arch == "new" and d == c.start: pass
            if rng.random() >= (prof["p_wd"] if d.weekday() < 5 else prof["p_we"]): continue
            used = [m for m, p in prof["models"].items() if rng.random() < p] or [next(iter(prof["models"]))]
            for m in used:
                T = rng.uniform(*prof["T"])
                c.rows.append((d, m) + tokens_for(m, T))
    claude_users.append(c); return c
for e in emps:
    if e.cl is not None: e.cu = make_cu(e.name, e.email, e.cl, e)
    else: e.cu = None
contractor_cu = make_cu(CONTRACTOR[0], CONTRACTOR[1], "regular")

def refresh_for(d):  # weekly D7 fetch on Fridays covering R-7 .. R-1
    k = (4 - d.weekday()) % 7
    return d + dt.timedelta(days=k or 7)

# ----------------------------------------------------------------------------------------------
# SQL writers
# ----------------------------------------------------------------------------------------------
def q(v):
    if v is None: return "NULL"
    if isinstance(v, (int,)): return str(v)
    if isinstance(v, float): return repr(round(v, 4))
    if isinstance(v, (D,)): return f"'{v.isoformat()}'"
    return "'" + str(v).replace("'", "''") + "'"

out = []
def insert(table, cols, rows, chunk=400):
    for i in range(0, len(rows), chunk):
        out.append(f"INSERT INTO {table} ({', '.join(cols)}) VALUES")
        out.append(",\n".join("  (" + ", ".join(q(v) for v in r) + ")" for r in rows[i:i + chunk]) + ";")
        out.append("")

out.append("""-- ============================================================================
-- TokenIQ test seed (generated, deterministic). Safe to re-run: it empties the tables first.
--
-- "Today" in this dataset is Sun 2026-10-25; the latest scheduler fetch ran Fri 2026-10-23.
--   * Copilot  : D30 snapshots fetched 2026-08-28, 2026-09-25, 2026-10-23
--   * Claude   : D7 weekly fetches every Friday, 2026-08-07 .. 2026-10-23
-- See db/README.md for the scenarios covered and the expected dashboard numbers.
-- ============================================================================
TRUNCATE TABLE copilot_usage_user_detail, copilot_user_count_summary, copilot_user_count_trend,
               claude_usage_user_detail, claude_cost_user_detail, claude_organization_users, workday_employees
               RESTART IDENTITY;
""")

# ---- workday_employees (employee_id is auto-generated by the table)
wcols = ("user_id, full_name, email_work, email_home, department, division, job_title, employee_status, manager_user_name, manager_name, "
         "location, hire_date, created_at, updated_at, last_synced_at, team_member_id, manager_level_1_user_id, manager_level_1_user_name, "
         "manager_level_2_user_id, manager_level_2_user_name, manager_level_3_user_id, manager_level_3_user_name, manager_level_4_user_id, "
         "manager_level_4_user_name, manager_level_5_user_id, manager_level_5_user_name, manager_level_6_user_id, manager_level_6_user_name, "
         "manager_level_7_user_id, manager_level_7_user_name, manager_level_8_user_id, manager_level_8_user_name, manager_level_9_user_id, "
         "manager_level_9_user_name").split(", ")
wrows = []
for e in emps:
    lv1 = (e.mgr_uid, e.mgr_name)                                   # direct manager (EVP, or CEO for EVPs)
    lv2 = CEO if not e.is_evp else (None, None)
    wrows.append([e.user_id, e.name, e.email, e.home, e.dept, e.div, e.title, e.status, e.mgr_uid, e.mgr_name, e.loc, e.hire,
                  "2026-09-01 02:00:00", "2026-10-20 02:00:00", "2026-10-25 02:00:00", str(e.seq), lv1[0], lv1[1], lv2[0], lv2[1]]
                 + [None] * 14)
assert len(wcols) == len(wrows[0]), (len(wcols), len(wrows[0]))
out.append("-- Workday employees: 6 EVPs + 50 staff active, 2 terminated, reporting to CEO rkulkarni (not in the table)")
insert("workday_employees", wcols, wrows)

# ---- Copilot detail / summary / trend
dcols = ("report_refresh_date, user_principal_name, display_name, last_activity_date, copilot_chat_last_activity_date, "
         "microsoft_teams_copilot_last_activity_date, word_copilot_last_activity_date, excel_copilot_last_activity_date, "
         "powerpoint_copilot_last_activity_date, outlook_copilot_last_activity_date, onenote_copilot_last_activity_date, "
         "loop_copilot_last_activity_date, report_period, prompts_submitted_all_apps, prompts_submitted_copilot_chat_work, "
         "prompts_submitted_copilot_chat_web, active_usage_days_all_apps, edge_last_activity_date, microsoft_365_app_last_activity_date, "
         "copilot_chat_work_last_activity_date, copilot_chat_web_last_activity_date, snapshot_fetched_at").split(", ")
APP_ORDER = ["chat", "teams", "word", "excel", "powerpoint", "outlook", "onenote", "loop"]
def last_date(e, R, pred):
    ds = [d for d, rec in e.cp_days.items() if d < R and pred(rec)]
    return max(ds) if ds else None
def ts(R): return f"{R.isoformat()} 03:00:00+00"

drows = []; summary_rows = []; trend_rows = []
snap_stats = {}
for R in CP_SNAPSHOTS:
    w0, w1 = window(R)
    # a report lists every user enabled at fetch time OR active inside the window (e.g. someone who left mid-window)
    lic = [e for e in emps if e.cp is not None and (licensed_on(e, R - dt.timedelta(days=1))
                                                    or any(w0 <= d <= w1 for d in e.cp_days))]
    n_enabled = sum(1 for e in emps if licensed_on(e, R - dt.timedelta(days=1)))
    active_users = 0; per_app_users = defaultdict(int); tot_prompts = 0
    for e in lic:
        win = {d: r for d, r in e.cp_days.items() if w0 <= d <= w1}
        prompts = sum(r["prompts"] for r in win.values())
        work = sum(r["work"] for r in win.values()); web = sum(r["web"] for r in win.values())
        copilot_days = [d for d, r in win.items() if r["apps"] & set(CP_APPS)]
        row = [R, e.email, e.name, last_date(e, R, lambda r: bool(r["apps"] & set(CP_APPS)))]
        for a in APP_ORDER: row.append(last_date(e, R, lambda r, a=a: a in r["apps"]))
        row += ["D30", prompts, work, web, len(copilot_days),
                last_date(e, R, lambda r: "edge" in r["apps"]), last_date(e, R, lambda r: "m365app" in r["apps"]),
                last_date(e, R, lambda r: r["work"] > 0), last_date(e, R, lambda r: r["web"] > 0), ts(R)]
        drows.append(row)
        tot_prompts += prompts
        if copilot_days: active_users += 1
        for a in APP_ORDER:
            if any(a in r["apps"] for r in win.values()): per_app_users[a] += 1
        for k, f in (("work", lambda r: r["work"] > 0), ("web", lambda r: r["web"] > 0)):
            if any(f(r) for r in win.values()): per_app_users[k] += 1
        for k in EXTRA:
            if any(k in r["apps"] for r in win.values()): per_app_users[k] += 1
    n = n_enabled
    summary_rows.append([R, "D30", n, active_users, n, per_app_users["teams"], n, per_app_users["word"], n, per_app_users["powerpoint"],
                         n, per_app_users["outlook"], n, per_app_users["excel"], n, per_app_users["onenote"], n, per_app_users["loop"],
                         n, per_app_users["chat"], ts(R)])
    snap_stats[R] = dict(licensed=n, rows=len(lic), active=active_users, prompts=tot_prompts)
    for d in daterange(w0, w1):
        en = sum(1 for e in emps if licensed_on(e, d))
        recs = [e.cp_days[d] for e in emps if d in e.cp_days]
        act = [r for r in recs if r["apps"] & set(CP_APPS)]
        cnt = lambda a: sum(1 for r in act if a in r["apps"])
        trend_rows.append([R, "D30", d, en, len(act), en, cnt("teams"), en, cnt("word"), en, cnt("powerpoint"), en, cnt("outlook"),
                           en, cnt("excel"), en, cnt("onenote"), en, cnt("loop"), en, cnt("chat"), en, cnt("edge"), en, cnt("m365app"),
                           en, sum(1 for r in act if r["work"] > 0), en, sum(1 for r in act if r["web"] > 0),
                           sum(r["prompts"] for r in act), ts(R)])
out.append("-- Copilot per-user usage: one D30 snapshot per fetch date")
insert("copilot_usage_user_detail", dcols, drows)
scols = ("report_refresh_date, report_period, any_app_enabled_users, any_app_active_users, microsoft_teams_enabled_users, microsoft_teams_active_users, "
         "word_enabled_users, word_active_users, powerpoint_enabled_users, powerpoint_active_users, outlook_enabled_users, outlook_active_users, "
         "excel_enabled_users, excel_active_users, onenote_enabled_users, onenote_active_users, loop_enabled_users, loop_active_users, "
         "copilot_chat_enabled_users, copilot_chat_active_users, snapshot_fetched_at").split(", ")
out.append("-- Copilot summary counts per snapshot (licensed vs active in the 30-day window)")
insert("copilot_user_count_summary", scols, summary_rows)
tcols = ("report_refresh_date, report_period, report_date, any_app_enabled_users, any_app_active_users, microsoft_teams_enabled_users, microsoft_teams_active_users, "
         "word_enabled_users, word_active_users, powerpoint_enabled_users, powerpoint_active_users, outlook_enabled_users, outlook_active_users, "
         "excel_enabled_users, excel_active_users, onenote_enabled_users, onenote_active_users, loop_enabled_users, loop_active_users, "
         "copilot_chat_enabled_users, copilot_chat_active_users, edge_enabled_users, edge_active_users, microsoft_365_app_enabled_users, "
         "microsoft_365_app_active_users, copilot_chat_work_enabled_users, copilot_chat_work_active_users, copilot_chat_web_enabled_users, "
         "copilot_chat_web_active_users, prompts_submitted, snapshot_fetched_at").split(", ")
out.append("-- Copilot daily trend: each snapshot carries its 30 daily points")
insert("copilot_user_count_trend", tcols, trend_rows)

# ---- Claude usage + cost
ucols = "report_refresh_date, report_period, usage_date, user_id, email, display_name, model, input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens, request_count".split(", ")
ccols = "report_refresh_date, report_period, cost_date, user_id, email, display_name, model, currency, input_cost_usd, output_cost_usd, cache_read_cost_usd, cache_creation_cost_usd, total_cost_usd".split(", ")
urows, crows = [], []
for c in claude_users:
    for (d, m, inp, o, cr, cc, rq) in c.rows:
        R = refresh_for(d)
        urows.append([R, "D7", d, c.user_id, c.email, c.name, m, inp, o, cr, cc, rq])
        p = PRICES[m]
        parts = [round(inp * p[0] / 1e6, 4), round(o * p[1] / 1e6, 4), round(cr * p[2] / 1e6, 4), round(cc * p[3] / 1e6, 4)]
        crows.append([R, "D7", d, c.user_id, c.email, c.name, m, "USD"] + parts + [round(sum(parts), 4)])
urows.sort(key=lambda r: (r[2], r[4], r[6])); crows.sort(key=lambda r: (r[2], r[4], r[6]))
out.append("-- Claude usage: one row per user, day and model; fetched weekly (D7)")
insert("claude_usage_user_detail", ucols, urows)
out.append("-- Claude cost: same grain as usage; cost = tokens x per-model price (USD per million tokens)")
insert("claude_cost_user_detail", ccols, crows)

# ---- Claude org roster
rcols = "user_id, email, display_name, role, membership_status, license_tier, last_active_at".split(", ")
rrows = []
for c in claude_users:
    last = max((r[0] for r in c.rows), default=None)
    lat = f"{last.isoformat()} {rng.randint(8, 18):02d}:{rng.randint(0, 59):02d}:00" if last else None
    role = "admin" if (c.emp and c.emp.title == "EVP, Engineering") else ("developer" if (c.emp and c.emp.dept == "Engineering" and c.arch == "power") else "user")
    tier = "Team Premium" if c.arch in ("power", "regular") else "Team Standard"
    status = "active" if not (c.emp and c.emp.term) else "removed"
    rrows.append([c.user_id, c.email, c.name, role, status, tier, lat])
out.append("-- Claude organization roster (includes licensed users with no usage)")
insert("claude_organization_users", rcols, rrows)

open(OUT, "w").write("\n".join(out))

print(f"wrote {OUT}: {len(emps)} employees, {len(drows)} copilot detail rows, {len(trend_rows)} trend rows, {len(urows)} claude usage rows")
