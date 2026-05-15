# Copilot Prompts – Implementation Plan (Clean + Safe)

> Use these prompts **one by one**. Each prompt assumes TypeScript.

## Phase 0 – Repo bootstrap
**Prompt:**
Create a pnpm-workspaces monorepo with:
- `apps/admin` = Vite + React + TS + Tailwind
- `apps/overlays` = Vite + React + TS + Tailwind (transparent widgets)
- `server` = Node.js + TS (Fastify preferred) + ws (WebSocket)
- `packages/shared` = TS library with path aliases

Add eslint + prettier + tsconfig references. Provide scripts:
`dev`, `build`, `lint`, `typecheck`.

## Phase 1 – Shared contracts
**Prompt:**
In `packages/shared`, define:
- DTOs for `ScoreboardDTO`, `LiveStatsDTO`, `TickerItemDTO`, `StandingsRowDTO`, `LineupDTO`
- WS channel naming helpers
- Zod schemas for each DTO (validate at runtime)
Export everything for both server and apps.

## Phase 2 – SportMonks client (server)
**Prompt:**
Implement a SportMonks HTTP client in `server/src/sportmonks/client.ts`:
- baseURL `https://api.sportmonks.com/v3/football`
- supports `include` param with `;` separator
- supports `filters`, `select`, `timezone`, `locale`
- retry with exponential backoff for 429/5xx
- strict typing for responses (unknown -> validate -> typed)

Do NOT call SportMonks from the browser.

## Phase 3 – Polling strategy (Fixture entity budget safe)
**Prompt:**
Implement `server/src/polling/fixturePoller.ts` that:
- Maintains a single polling loop for “Fixture entity” data.
- Inputs: `mainFixtureId`, `tickerFixtureIds[]`, `date`, `leagueId`, `seasonId`.
- On each tick (e.g. 1500ms) call ONE SportMonks endpoint for live fixtures:
  - Prefer `livescores/latest` if possible; otherwise `livescores/inplay` + filters.
- Use **includes** to fetch: `events;statistics;periods;participants;venue;season;stage;round;group;coaches;timeline;metadata;sidelined;referees;formations;scores;aggregate;weatherReport;state;league;sport`
- Map/normalize to DTOs.
- Debounce emissions: only publish when payload changes (deep hash).

Also create a slower refresh loop (e.g. 10–60s) for less volatile data **without hitting Fixture entity again** (use already cached fixture payload to compute those views).

## Phase 4 – WebSocket hub
**Prompt:**
Implement a WS server with:
- subscribe/unsubscribe to channel strings
- publish DTO payloads per channel
- heartbeat/ping
- guardrails: max payload size, max subscriptions per client
Provide example client usage.

## Phase 5 – Admin UI (matches)
**Prompt:**
In `apps/admin` implement:
- Left menu: Matches / Overlays
- Matches page:
  - date picker
  - competition (league) dropdown
  - list fixtures with search
  - set “Main match”
  - select up to 20 “Ticker matches”
- Persist selection via backend REST endpoints (`/admin/config`).

Use WS to show current state_id, minute, score in the list.

## Phase 6 – Widgets (overlays)
**Prompt:**
In `apps/overlays`, implement routes + components:
- Scoreboard widget (timer + teams + score)
- Live stats widget (shots, shots on target, corners, fouls)
- Live ticker widget (list of up to 20 items with state/minute/score)
- Standings widget (table + live movement indicator)
- Tactical lineups widget (formation pitch layout + players + coach)

Each widget:
- transparent background
- reads params from URL
- connects to WS channel
- handles disconnected state gracefully
- uses only DTOs (no raw SportMonks)

## Phase 7 – Master overlay composer
**Prompt:**
Implement `/master/:overlayId` page that:
- Fetches overlay config (widget URLs + positions)
- Renders each widget inside an iframe/div container at set coordinates
- Supports toggle on/off per widget
- No visual editor here (editor stays in admin)

## Phase 8 – Hardening
**Prompt:**
Add:
- rate-limit awareness (log remaining, auto slow down when near 0)
- payload validation (zod)
- structured logging
- error boundary UI for widgets
- basic auth for admin endpoints
- snapshot tests for DTO mapping functions
