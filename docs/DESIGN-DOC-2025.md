# Păreri Neavizate 2.0 — Design Document

> **Last Updated:** Ianuarie 2025  
> **Status:** Production-ready

---

## 📋 Cuprins

1. [Prezentare generală](#1-prezentare-generală)
2. [Arhitectură](#2-arhitectură)
3. [Structura proiectului](#3-structura-proiectului)
4. [Client (React/Vite)](#4-client-reactvite)
5. [Server (Node/Express)](#5-server-nodeexpress)
6. [WebSocket Protocol](#6-websocket-protocol)
7. [Data Flow](#7-data-flow)
8. [Overlay Pages](#8-overlay-pages)
9. [Theming System](#9-theming-system)
10. [API Endpoints](#10-api-endpoints)
11. [Development Setup](#11-development-setup)

---

## 1. Prezentare generală

**Păreri Neavizate 2.0** este o aplicație locală pentru watchalong care generează overlay-uri broadcast pentru OBS (Browser Source), controlate printr-un Admin Panel, cu date live din SportMonks API.

### Caracteristici principale

- **Real-time updates** via WebSocket
- **Master Overlay** - single browser source cu toate widget-urile
- **Admin Panel** - control live pentru toggle-uri, meciuri, teme
- **Multi-format** - suport 16:9 și 9:16
- **Theming** - teme pe competiție (Champions League, Premier League, etc.)
- **Lineups** - afișare formație 2D cu poziționare corectă

---

## 2. Arhitectură

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ARCHITECTURE OVERVIEW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────┐         ┌─────────────────────────────────────┐   │
│   │  SportMonks │────────►│              SERVER                 │   │
│   │     API     │         │  ├─ PollingManager                  │   │
│   └─────────────┘         │  │   ├─ FixtureOrchestrator         │   │
│                           │  │   └─ StandingsPoller             │   │
│                           │  ├─ AppStateStore (Zustand)         │   │
│                           │  ├─ WidgetDataCache                 │   │
│                           │  ├─ WebSocket Server                │   │
│                           │  └─ HTTP Routes                     │   │
│                           └──────────────┬──────────────────────┘   │
│                                          │                           │
│                              WebSocket   │   HTTP                    │
│                                          ▼                           │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │                          CLIENT                               │  │
│   │  ┌────────────┐    ┌────────────────────────────────────┐   │  │
│   │  │   Admin    │    │           Overlay Pages            │   │  │
│   │  │   Panel    │    │  ├─ Master (all widgets)           │   │  │
│   │  │            │    │  ├─ Scoreboard                      │   │  │
│   │  │  Controls  │    │  ├─ Lineups (Home/Away)             │   │  │
│   │  │  Toggles   │    │  ├─ Standings / LiveStandings       │   │  │
│   │  │  Actions   │    │  └─ StartingSoon                    │   │  │
│   │  └────────────┘    └────────────────────────────────────┘   │  │
│   └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Principii cheie

1. **Server = Source of Truth** - ține starea curentă și decide polling
2. **UI = Dumb** - overlay-urile nu cunosc SportMonks, doar modele interne
3. **Adapter Layer** - SportMonks se mapează în modele stabile
4. **Master Overlay** - single browser source pentru toate widget-urile

---

## 3. Structura proiectului

```
PareriNeavizate 2.0/
├── apps/
│   └── client/                 # React + Vite frontend
│       └── src/
│           ├── pages/          # Overlay pages + Admin
│           ├── components/     # Shared components
│           │   └── primitives/ # Panel, Badge
│           ├── hooks/          # Custom hooks
│           ├── store/          # Zustand stores
│           ├── theme/          # Theming system
│           └── ws/             # WebSocket client
│
├── packages/
│   ├── server/                 # Node + Express backend
│   │   └── src/
│   │       ├── http/           # Routes, middleware, metrics
│   │       ├── polling/        # FixtureOrchestrator + StandingsPoller
│   │       ├── providers/      # SportMonks + Mock providers
│   │       ├── services/       # WidgetDataCache
│   │       ├── store/          # AppStateStore
│   │       ├── utils/          # Logger
│   │       ├── validation/     # Zod schemas
│   │       └── ws/             # WebSocket server
│   │
│   └── shared/                 # Shared types & constants
│       └── src/
│           ├── models.ts       # TypeScript interfaces
│           ├── wsEvents.ts     # WebSocket event types
│           └── constants.ts    # Shared constants
│
├── data/                       # Persisted state (state.json)
└── docs/                       # Documentation
```

---

## 4. Client (React/Vite)

### Stack

- **Vite** - Build tool
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Zustand** - State management

### Pages

| Rută | Descriere |
|------|-----------|
| `/admin` | Admin Panel - control meciuri, toggles, teme |
| `/overlay/master` | Master Overlay - all widgets în one source |
| `/overlay/scoreboard` | Scoreboard separat |
| `/overlay/lineups` | Lineups HOME |
| `/overlay/lineups-away` | Lineups AWAY |
| `/overlay/standings` | Clasament competiție |
| `/overlay/livestandings` | Clasament live cu evidențieri |
| `/overlay/startingsoon` | Pre-match countdown |

### Components

```
components/
└── primitives/
    ├── Panel.tsx      # Container glassmorphism
    └── Badge.tsx      # Status badges
```

### Hooks

| Hook | Scop |
|------|------|
| `useAppState()` | Conexiune WS + state sync |
| `useWidgetData()` | Fetch date widget de la server |
| `useAnimation()` | Animation utilities |

---

## 5. Server (Node/Express)

### Stack

- **Node.js** - Runtime
- **Express** - HTTP server
- **ws** - WebSocket library
- **Zustand** - State management (server-side)
- **Zod** - Validation

### Module principale

#### 5.1 Polling (v4 - Consolidated Orchestrator)

**⚠️ IMPORTANT: Polling rates sunt calibrate și NU trebuie modificate fără aprobare!**

```typescript
// PollingManager - orchestrează pollerele
class PollingManager {
  fixtureOrchestrator: FixtureOrchestrator;  // Unified fixture polling (2s)
  standingsPoller: StandingsPoller;          // Standings polling (10s)
}

// Default values in config.ts:
// FIXTURE_POLL_MS = 2000   (2 secunde)
// STANDINGS_POLL_MS = 10000 (10 secunde)
```

**Arhitectura polling (v4):**

- **FixtureOrchestrator**: Single `/fixtures/multi/{ids}` call every 2s
  - Fetches ALL data: scores, events, stats, trends, lineups
  - Handles both MainMatch AND Ticker in unified call
  - Consumă: ~1,800 Fixture requests/h (60% din limită)
  
- **StandingsPoller**: `/standings/live/leagues/{id}` every 10s
  - Separate rate limit entity (standings vs fixtures)
  - Consumă: ~360 Standing requests/h (12% din limită)

**Beneficii arhitectură consolidată:**
- Reduce numărul de API calls (de la 4 pollere separate la 2)
- Elimină duplicate requests pentru același meci
- GoalDetector integrat pentru auto-detectare goluri

#### 5.2 Providers

```typescript
// Provider interface pentru data sources
interface Provider {
  getLiveMatches(): Promise<LiveMatch[]>;
  getMatch(matchId: number): Promise<Match>;
  getLineups(matchId: number): Promise<Lineups>;
  getStandings(seasonId: number): Promise<Standing[]>;
  // ...
}

// Implementări
- SportMonksProvider (production)
- MockProvider (development/testing)
```

#### 5.3 AppStateStore

```typescript
interface AppState {
  mainMatchId: number | null;
  mainMatch: Match | null;
  tickerMatchIds: number[];
  tickerMatches: LiveMatch[];
  theme: ThemeKey;
  toggles: Toggles;
  provider: ProviderInfo;
  events: MatchEvent[];
}
```

#### 5.4 WidgetDataCache

Cache inteligent pentru date widget cu TTL configurabil:
- Standings: 5 minute
- Lineups: 2 minute
- TopScorers: 10 minute

---

## 6. WebSocket Protocol

### Events Server → Client

| Event | Payload | Descriere |
|-------|---------|-----------|
| `state:update` | `AppState` | Full state broadcast |
| `state:partial` | `Partial<AppState>` | Partial update |

### Events Client → Server

| Event | Payload | Descriere |
|-------|---------|-----------|
| `admin:action` | `AdminAction` | Admin commands |
| `get:state` | - | Request current state |

### Admin Actions

```typescript
type AdminAction =
  | { type: 'SET_MAIN_MATCH'; matchId: number }
  | { type: 'SET_TICKER_MATCHES'; matchIds: number[] }
  | { type: 'SET_THEME'; theme: ThemeKey }
  | { type: 'TOGGLE'; key: keyof Toggles; value: boolean }
  | { type: 'SIMULATE_EVENT'; event: SimulatedEvent };
```

---

## 7. Data Flow

```
1. Admin selectează meci în UI
         │
         ▼
2. Client trimite admin:action (WS)
         │
         ▼
3. Server procesează action
         │
         ├── Updatează AppStateStore
         ├── Pornește/oprește pollere
         └── Persistă în state.json
         │
         ▼
4. Server broadcast state:update (WS)
         │
         ▼
5. Toate overlay-urile primesc noul state
         │
         ▼
6. UI re-randează conform toggles
```

---

## 8. Overlay Pages

### 8.1 Master Overlay (`/overlay/master`)

Single browser source care conține TOATE widget-urile:

- **Scoreboard** - Scor, ceas, evenimente
- **Lineups** - HOME și AWAY
- **Standings** - Clasament
- **LiveStandings** - Clasament cu evidențieri

Fiecare widget e controlat de un toggle individual:
```typescript
toggles.showScoreboard
toggles.showLineupsHome
toggles.showLineupsAway
toggles.showStandings
toggles.showLiveStandings
```

### 8.2 Lineups Overlay

Afișează formația echipei pe un pitch 2D:

- **Poziționare**: GK la 6% stânga, restul în funcție de formație
- **Offset vertical**: -5% pentru balans vizual
- **Ordine inversată**: Jucătorii din dreapta apar corect
- **FORM**: Ultimele 5 rezultate (W/D/L)

```typescript
// Formație parsing
"4-4-2" → [4, 4, 2] → 
  - Linia 1 (DEF): 4 jucători la 30%
  - Linia 2 (MID): 4 jucători la 55%
  - Linia 3 (ATT): 2 jucători la 80%
```

---

## 9. Theming System

### Theme Structure

```typescript
interface Theme {
  key: ThemeKey;
  name: string;
  colors: {
    primary: string;      // Accent principal
    secondary: string;    // Accent secundar
    accent: string;       // Highlights
    background: string;   // Background overlay
    panel: string;        // Panel background
    text: string;         // Text principal
    muted: string;        // Text secundar
    stroke: string;       // Borders
    success: string;      // Win/Goal
    danger: string;       // Red card/Loss
    warning: string;      // Yellow card/Draw
  };
}
```

### Teme disponibile

- `ucl` - Champions League (albastru/auriu)
- `epl` - Premier League (violet)
- `laliga` - La Liga (roșu/galben)
- `seriea` - Serie A (verde/roșu)
- `bundesliga` - Bundesliga (roșu)
- `ligue1` - Ligue 1 (albastru)
- `euro` - European Championship

---

## 10. API Endpoints

### Widget Data

| Endpoint | Descriere |
|----------|-----------|
| `GET /api/widgets/standings?seasonId=X` | Clasament sezon |
| `GET /api/widgets/lineups?matchId=X` | Lineup-uri meci |
| `GET /api/widgets/topscorers?seasonId=X` | Golgeteri |
| `GET /api/widgets/h2h?team1=X&team2=Y` | Head-to-head |

### Debug

| Endpoint | Descriere |
|----------|-----------|
| `GET /api/debug/state` | Current AppState |
| `GET /api/debug/cache` | Cache status |
| `GET /api/metrics` | Prometheus metrics |

---

## 11. Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- SportMonks API token

### Comenzi

```bash
# Install dependencies
pnpm install

# Start development (server + client)
pnpm dev

# Build production
pnpm build

# Start production
pnpm start
```

### Environment Variables

```env
SPORTMONKS_TOKEN=your_api_token
SPORTMONKS_BASE_URL=https://api.sportmonks.com/v3/football
PORT=3001
```

### ⚠️ Polling Configuration (IMPORTANT!)

**NU MODIFICA** valorile default din `config.ts` fără aprobare! Acestea sunt calibrate pentru performanță optimă:

| Poller | Variable | Default | Req/h | Descriere |
|--------|----------|---------|-------|-----------|
| **Main Match** | `POLL_MAIN_MATCH_MS` | **1500ms** (1.5s) | ~2400 | DIRECT API - delay minim pentru scoreboard! MUST! |
| **Livescores** | `POLL_LIVESCORES_MS` | **9000ms** (9s) | ~400 | Pentru ticker - toate meciurile live |
| **Ticker** | `POLL_TICKER_MS` | **15000ms** (15s) | - | Update ticker widget (uses cache) |

**Arhitectură (CRITICAL):**
- MainMatchPoller face request **DIRECT** la `/fixtures/{id}` - NU din cache!
- Asta asigură delay de doar ~1.5s între update SportMonks și scoreboard
- LivescoresPoller e folosit DOAR pentru ticker, nu pentru main match

**Rate Limit Budget (Fixture Entity = 3000/h):**
- Main Match: ~2400/h (80%) - PRIORITATE MAXIMĂ!
- Livescores: ~400/h (13%) - ticker updates
- **Headroom: ~200/h (7%)** - pentru widget calls, retry-uri, erori

**Override prin env vars:**
```env
POLL_MAIN_MATCH_MS=1500
POLL_LIVESCORES_MS=9000
POLL_TICKER_MS=15000
```

### OBS Setup

1. Add Browser Source
2. URL: `http://localhost:5173/overlay/master`
3. Resolution: 1920×1080 (16:9) sau 1080×1920 (9:16)
4. ✅ Shutdown source when not visible
5. ✅ Refresh browser when scene becomes active

---

## 📝 Changelog

### v2.0 (Ianuarie 2025)

- ✅ Restructurat cu monorepo (pnpm workspaces)
- ✅ Master Overlay cu toate widget-urile
- ✅ Lineups cu FORM (W/D/L)
- ✅ Poziționare corectă jucători (invertedIndex)
- ✅ WidgetDataCache pentru performance
- ✅ Logging structurat cu namespaces
- ✅ Cleanup componente nefolosite

---

> **Contact:** Păreri Neavizate Team
