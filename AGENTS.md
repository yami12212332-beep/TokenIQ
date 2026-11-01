# Agent safety rules — office network / EDR-protected VM

This project runs on a corporate Windows machine protected by CrowdStrike Falcon
(and possibly other EDR tooling). Treat every shell command as observable and
potentially blocked. **Safety over speed.**

These rules apply to every agent/session working in this repository. If a task
seems to require a forbidden action, stop and ask the user instead of running it.

---

## Never run (hard block)

- **Process termination of any kind**
  - `taskkill`, `taskkill /F /T`, `Stop-Process`, `kill`, `pkill`, `killall`
  - killing `python.exe`, `node.exe`, or any dev-server process
- **Credential / secret access**
  - `cmdkey /list` or any credential-manager enumeration
  - `git credential fill`, `git credential approve/reject`
  - reading browser/OS credential stores, registry secrets, `.env` values for exfiltration
- **PowerShell policy bypass / obfuscation**
  - `-ExecutionPolicy Bypass`, `-EncodedCommand`, `Invoke-Expression` of remote content
  - download-and-execute (`iwr ... | iex`, `curl ... | bash`)
- **Process / network discovery**
  - `Get-CimInstance Win32_Process`, `Get-Process` command-line inspection
  - `Get-NetTCPConnection`, `netstat`, `ss`, port scans, `nmap`
- **Destructive database operations without explicit approval**
  - `DROP`, `TRUNCATE`, `DELETE` without a `WHERE`, running `db/seed*.sql` on a server
  - Never run demo seeds on production.

## Safe defaults (preferred)

- **Check services over HTTP**, not by inspecting ports/processes:
  - `http://127.0.0.1:8001/api/health`
  - `http://localhost:3001`
- **Start servers only when the user asks.** Prefer giving the user the exact
  commands to run in their own terminal.
- If a port is busy, ask the user to stop the old server with **Ctrl+C** in its
  terminal. Do not kill it.
- Use the **file tools** (`read`, `edit`, `write`) for changes.
- `git add/commit/push` are allowed; never commit `.env` or secrets.
- Before any command that could plausibly trip EDR, **explain it and ask first**.
- Prefer minimal, single-purpose commands over long PowerShell pipelines.
- Never run background commands that cannot be stopped cleanly.

## Environment facts

- Windows, PowerShell, Python 3.12 (global + optional `.venv`), Node 24.
- Backend: FastAPI on `:8001`, DB `tokeniq_db` / `postgres`.
- Frontend: Vite on `:3001`.
- Employee data: `assetiq_db` via `assetiq_fdw.workday_employees`.
- The repo is public: `https://github.com/yami12212332-beep/TokenIQ`.

## If EDR blocks something

1. Do not retry the same command.
2. Report the exact command and the EDR message to the user.
3. Ask IT/security to allowlist the project path if it is a false positive.
