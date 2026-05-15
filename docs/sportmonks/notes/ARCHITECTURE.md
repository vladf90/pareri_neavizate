# Overlay Builder – Project Structure (Vite + React + Backend)

This repo layout is optimized for:
- **Admin UI** (select matches, manage overlays/widgets)
- **Standalone overlay widgets** (scoreboard, stats, ticker, standings, lineups)
- **Master overlay** that composes widgets by embedding their URLs (OBS Browser Source friendly)
- **Single SportMonks “Fixture” entity poll loop** to avoid duplicate entity consumption (livescores + fixtures are same entity)
- **Backend-only SportMonks access**, with **WebSocket** fan-out to widgets/admin

## Recommended monorepo (pnpm workspaces)

```
repo/
  apps/
    admin/                 # React admin app (Vite)
    overlays/              # React overlays app (Vite) – routes render transparent widgets
  server/                  # Node.js/TS backend (Fastify or Express)
  packages/
    shared/                # Shared types, utils (zod schemas, DTOs)
    ui/                    # Optional shared UI components (Tailwind)
  docs/                    # Product + API docs for Copilot and humans
  scripts/                 # One-off scripts (snapshot responses, validate schemas)
```

### Why split `admin` and `overlays`?
- OBS / broadcast overlays are usually deployed with very strict CSS + transparent backgrounds.
- Admin UI needs heavier UI state, auth, forms, tables.
- Separation reduces risk of shipping admin-only code to overlay routes.

## Backend responsibilities

### 1) Polling / caching (critical)
- Poll **Fixture entity** once per interval for *all live needs*.
  - Use either `livescores/latest` (10s updates) or your chosen livescores endpoint.
  - If you need *non-live* data too, **merge** it into the same cache key for that fixture set and refresh less often **without** calling Fixture entity again.
- Maintain an in-memory cache (plus optional Redis) keyed by:
  - `mainMatchFixtureId`
  - `tickerFixtureIds[]` (max 20)
  - `competitionId + date`
- Normalize SportMonks response into a compact DTO for frontend.

### 2) WebSocket gateway
- Admin subscribes to:
  - `match:list:{date}:{leagueId}`
  - `match:main:{fixtureId}`
  - `match:ticker:{fixtureId1,fixtureId2...}`
- Overlays subscribe to their widget channel:
  - `widget:scoreboard:{fixtureId}`
  - `widget:stats:{fixtureId}`
  - `widget:ticker:{fixtureIdsHash}`
  - `widget:standings:{seasonOrLeague}`

### 3) “Overlay config” store
- Save overlay definitions:
  - master overlay layout (positions, sizes, z-index)
  - widget toggles (on/off)
  - widget params (fixture ids, league ids, theme)
- Use SQLite/Postgres.

## Frontend responsibilities

### `apps/admin`
- Left menu:
  - Matches (date + competition)
  - Overlays (master overlay + widgets list with toggles)
- Pages:
  - Match picker -> choose main match + ticker matches
  - Overlay builder -> arrange widget frames; copy URLs
- Uses WebSocket to show live previews.

### `apps/overlays`
- Routes:
  - `/widget/scoreboard/:fixtureId`
  - `/widget/stats/:fixtureId`
  - `/widget/ticker?ids=...`
  - `/widget/standings?season=...`
  - `/widget/lineups/:fixtureId`
  - `/master/:overlayId` (optional – can also be external HTML that embeds widget iframes)
- All routes render transparent backgrounds and no scrollbars.

## Shared types (`shared`)
- `sportmonks.types.ts` (raw minimal)
- `dto.ts` (normalized payloads)
- `channels.ts` (WS channel naming)
- `schemas.ts` (zod schemas to validate backend->frontend payloads)

## Deployment model
- Backend: single origin (api.yourdomain)
- Frontends: static hosting (admin.yourdomain, overlays.yourdomain)
- OBS uses overlay URLs from `apps/overlays`.
