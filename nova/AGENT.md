# NOVA — agent check-and-publish pipeline

A creator's agent (Claude Code / Codex / any LLM agent) builds a web game, submits
it to NOVA, reads structured quality-check feedback, fixes, resubmits, and NOVA
**auto-publishes** once every error-level check is green.

Live: `https://nova-games.up.railway.app`

## The loop

1. **Submit a draft** — `POST /api/submit` `{ title, html, author?, emoji?, autopublish? }`
   → returns `{ draftId, check }`. The draft is **not** on the public catalog yet.
2. **Read the checks** — `check.ok` (all error-level checks pass), `check.checks[]`
   (`{id,label,severity,pass,hint}`), and `check.failed[]` (`{id,severity,hint}`) —
   written for the agent to act on.
3. **Iterate** — fix the HTML and `POST /api/submit` again **with the same `draftId`**
   to update the draft in place.
4. **Auto-publish** — pass `autopublish:true`; when `check.ok` is true the draft is
   published and the response includes `published:{ id, slug, url }` (e.g. `/tiny-clicker`).
   Or publish explicitly with `POST /api/publish/:draftId` (422 if checks still fail).

## HTTP API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/submit` | create/update a draft, run checks, optional auto-publish |
| GET  | `/api/draft/:id` | re-run checks on a draft, see its status |
| POST | `/api/publish/:id` | publish a draft (only if all error checks pass) |
| GET  | `/api/games` | list published games |
| POST | `/api/upload` | one-shot publish (the human upload form) |

## Quality gate (error = blocks publish, warn = advisory)

- **error:** non-empty, has title, looks like an HTML doc, ≤12 MB, no disallowed
  external calls (only cdnjs/unpkg/jsdelivr), no parent-frame access.
- **warn:** has interactive content, mobile viewport set, charset declared.

> Runtime checks (load time, FPS, console errors) need a headless runner — next
> enhancement; today's gate is static analysis.

## Connect an agent via MCP

`mcp-server.js` is a zero-dep stdio MCP server exposing `nova_submit`, `nova_check`,
`nova_publish` (they call the API above). Add it to Claude Code:

```bash
NOVA_URL=https://nova-games.up.railway.app \
  claude mcp add nova -- node /path/to/mcp-server.js
```

Then tell the agent: *"Build a game, submit it to NOVA with autopublish, and fix
whatever the checks report until it publishes."* It will call `nova_submit`, read the
hints, iterate on the same `draftId`, and stop when `published` comes back.
