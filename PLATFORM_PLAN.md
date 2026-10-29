# PopCraft → Web Game Platform — Vision & Plan

> Captured from product direction. This is a **planning doc**, not yet built.
> popcraft (the voxel game) becomes the first title / proof-of-concept on the platform.

## 1. The vision

A **super-convenient web game platform** — "link-and-play": every game runs in the
browser, and anything you get a link to opens in one click (no install, no build step
for the player).

Two sides:

### Creator side — agent-native publishing
- A creator **connects their own agent** (Claude Code / Codex / etc.) to the platform.
- One-click **upload a game they built** to run in the web version.
- On connect, **the platform drives the creator's agent**: it hands the agent the
  platform's **requirements, instructions, and a battery of checks** (metrics/quality
  gates). The agent **sees the feedback, self-modifies, and re-submits**, looping
  automatically.
- When **all checks/reviews pass → the game auto-publishes.**

### Player / community side — Steam-like
- Public catalog of browser games, each playable from a link.
- **Ratings, comments, reviews, likes**, discovery/trending.
- Creator pages, versions, update history.

## 2. Competitor landscape (research, Oct 2026)

**Closest to the vision — agent-native publishing / iteration loop**
- **Playgama** — MCP lets agents in Claude Code/Codex publish a game to Playgama
  Sandbox and return a live shareable link; announced an **iteration loop where agents
  see player data and ship updates** (Oct 14 2026). *This is the single closest competitor.*
- **Multiplayer Agent** — adds hosted multiplayer to browser games via MCP, returns play/share links.
- **Higgsfield "Supercomputer"** — prompt → game, hosts + multiplayer, one-click live link.
- **Rosebud AI** — generates JS (Three.js/Phaser), publishes to a hosted URL; fastest route to a playable browser game.
- **Astrocade** — casual/hyper-casual HTML5, instant remix loop.
- **PlayDrop** — 2D/3D + multiplayer browser games, single-link publish.
- **Gameer** — interactive fiction/visual novels, instant shareable link (runs on their runtime).
- **Replit / GDevelop AI / Unity Spark** — agent-in-editor builds + web hosting/publish.

**Distribution portals / community model (the "Steam for web games" reference)**
- **itch.io** — open, instant free publishing, creator sets price (default 90% to dev); vibrant community.
- **Poki** — largest curated portal (~100M MAU), ad-rev share, curated.
- **CrazyGames** — ~50M MAU, leans competitive/multiplayer, ad-rev share.
- **Newgrounds** — community-driven, portal voting, strong comment culture.
- Also: Game Jolt, Kongregate, Y8, GameDistribution, GX.games, Armor Games.

**Takeaways / where we'd differentiate**
- The agent-native tools (Playgama et al.) are **new and few** — the space is open, and
  nobody yet fully fuses **(a) agent-driven check→iterate→auto-publish gating** with
  **(b) a full Steam-like community catalog**. That fusion is the wedge.
- Portals (Poki/CrazyGames) curate manually and pay via ads; itch.io is open but has no
  automated quality/iteration loop. Our **automated gates + agent self-fix loop** is the
  differentiator vs both.
- "Link-and-play, one click" + "connect your own agent" is the convenience promise to lean on.

## 3. Rough phased roadmap

**Phase 0 — proof title (done/in progress):** popcraft runs in-browser, one link, no install;
deployed on Railway. Serves as the reference "good game" for the check suite.

**Phase 1 — host + play:** upload an HTML/JS game bundle → get a public link + embed.
Minimal: static hosting + a sandboxed iframe runner + a catalog page.

**Phase 2 — community:** accounts, game pages, ratings/likes/comments, trending/search.

**Phase 3 — the check suite (the moat):** define automated gates a submitted game must pass
— loads under N s, no console errors, runs ≥ target FPS, mobile-viewport OK, no network to
disallowed hosts, size budget, has title/controls/screenshot, content policy. Return
machine-readable pass/fail + reasons.

**Phase 4 — agent connection:** an **MCP/API** a creator's agent connects to. Platform sends
requirements + runs checks against the submitted build and returns structured feedback the
agent can act on; agent edits + resubmits in a loop; **all green → auto-publish.**
(Model: Playgama's MCP + iteration loop, but gated on our check suite and feeding our community.)

**Phase 5 — scale/monetize:** rev-share or subscription; featured/curation; multiplayer hosting.

## 4. Open questions
- Runtime/sandbox model (iframe isolation, allowed APIs, asset/size limits).
- Check-suite transport to agents (MCP tool vs REST webhook) and the pass/fail schema.
- Moderation + IP policy for user-uploaded games (no copyrighted-character reproduction).
- Hosting/CDN + per-game storage economics.
