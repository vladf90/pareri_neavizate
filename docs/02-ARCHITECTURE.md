# Principii cheie

1. **Serverul este Source of Truth**: ține starea curentă și decide ce se pollează.
2. **UI este dumb**: overlay-urile nu "cunosc" SportMonks, doar modele interne.
3. **Adapter Layer**: SportMonks se mapează într-un model intern stabil.
4. **Format split**: 16:9 și 9:16 sunt layout-uri separate (nu responsive "magic").
5. **Widget API**: Endpoint-uri REST dedicate pentru date widget (standings, h2h, form, etc.)
6. **Master Overlay** 🆕: Single browser source care conține ALL widgets, controlate via WebSocket toggles.

## Componente

### A) Server (Node)

Responsabilități:

- gestionează `AppState` (cu toggles pentru fiecare widget)
- persistă state local (state.json)
- rulează polling jobs (main match + ticker matches)
- expune WS pentru updates live și toggle control
- expune rute HTTP pentru widgets (`/api/widgets/*`)
- cache inteligent pentru date widget (WidgetDataCache)
- **Score mapping cu prioritate**: CURRENT > 2ND_HALF > 1ST_HALF

### B) Client (React)

Două "apps" în același bundle:

- **Admin UI**: scrie "actions" către server, controlează widget toggles
- **Overlays UI**: ascultă `state:update` și randază

### C) Widget Overlays (v1.3)

Overlay-uri dedicate pentru widget-uri OBS:

- **Master** 🆕 - Unified overlay cu ALL widgets într-un singur browser source
- **Standings** - Clasament competiție
- **H2H** - Head-to-head între echipe
- **Form** - Formă recentă echipe
- **TopScorers** - Golgeteri sezon
- **LiveStandings** - Clasament live cu evidențieri
- **Lineups** - Compoziții (HOME/AWAY, full/compact, formationPosition ordering)

### D) Master Overlay Architecture 🆕

```
┌─────────────────────────────────────────────────────────────────┐
│                    MASTER OVERLAY (/overlay/master)              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  WebSocket Connection (listens for state:update)            ││
│  │  ├── toggles.showScoreboard → Scoreboard widget             ││
│  │  ├── toggles.showTicker     → Ticker widget                 ││
│  │  ├── toggles.showStats      → Stats widget                  ││
│  │  ├── toggles.showStandings  → Standings widget              ││
│  │  ├── toggles.showH2H        → H2H widget                    ││
│  │  ├── toggles.showForm       → Form widget                   ││
│  │  ├── toggles.showTopScorers → TopScorers widget             ││
│  │  ├── toggles.showLineupsHome→ Lineup HOME widget            ││
│  │  ├── toggles.showLineupsAway→ Lineup AWAY widget            ││
│  │  └── toggles.showLiveStandings→ LiveStandings widget        ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  WidgetWrapper (animation container)                        ││
│  │  • Fade in/out transitions                                  ││
│  │  • No OBS scene switching needed                            ││
│  │  • Single browser source management                         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Data flow

1. Admin trimite `admin:action` către server (WS).
2. Server aplică action -> updatează `AppState` (inclusiv toggles).
3. Server pornește/oprește pollere după `AppState` (match principal + ticker set).
4. Server broadcast `state:update` către toate overlay-urile.
5. Overlay-urile (inclusiv Master) citesc toggles și randează doar widget-urile active.

## Toggle-uri Widget (v1.3)

```typescript
interface Toggles {
  showScoreboard: boolean;    // HUD/Scoreboard
  showTicker: boolean;        // Ticker meciuri live
  showStats: boolean;         // Panou statistici
  showEventToasts: boolean;   // Toast-uri evenimente
  showSponsorBug: boolean;    // Logo sponsor
  enable3DPitch: boolean;     // 3D pitch (performance)
  // Master Overlay Widgets
  showStandings: boolean;     // Clasament competiție
  showH2H: boolean;           // Head-to-head
  showForm: boolean;          // Formă echipe
  showTopScorers: boolean;    // Golgeteri
  showLineupsHome: boolean;   // Lineup HOME
  showLineupsAway: boolean;   // Lineup AWAY
  showLiveStandings: boolean; // Clasament live
}
```

## Persistență

- `data/state.json` (v1)
- scriere debounce (ex: 500ms) ca să nu scrii continuu.
- la start: load state; dacă lipsește, inițializează default.

## Polling Architecture (v4 - Consolidated Orchestrator)

### FixtureOrchestrator (Primary)
- **Single API call**: `/fixtures/multi/{ids}` every 2s
- **All fixture data**: scores, events, stats, trends, lineups
- **Handles both**: MainMatch + Ticker in one unified call
- **Rate limit**: ~1800/h used (60% of 3000/h Fixture entity limit)

### StandingsPoller (Separate)
- `/standings/live/leagues/{id}` or `/standings/seasons/{id}`
- Polls every 10s (separate rate limit entity)
- **Rate limit**: ~360/h used (12% of 3000/h Standing entity limit)

### Optimizations
- Backoff dacă erori (2s → 5s → 10s, max 30s)
- Cache în memorie: dacă răspuns identic, nu emite update inutil
- GoalDetector: Automatic goal alerts based on score changes

## Score Mapping (v1.3 fix) 🆕

SportMonks returnează multiple tipuri de scoruri pentru un meci:
- `CURRENT` - Scorul curent/final (cel mai precis)
- `2ND_HALF` - Scor cumulativ la sfârșitul reprizei a doua
- `1ST_HALF` - Scor doar din prima repriză

**Prioritate**: `CURRENT` > `2ND_HALF` > `1ST_HALF`

```typescript
function mapScore(scores: SMScore[]): Score {
  // Priority 1: CURRENT (most accurate)
  for (const s of scores) {
    if (s.description === "CURRENT") return extract(s);
  }
  // Priority 2: 2ND_HALF
  for (const s of scores) {
    if (s.description === "2ND_HALF") return extract(s);
  }
  // Priority 3: 1ST_HALF (only if match still in first half)
  for (const s of scores) {
    if (s.description === "1ST_HALF") return extract(s);
  }
  return { home: 0, away: 0 };
}
```

## Lineup Ordering (v1.3 fix) 🆕

Jucătorii sunt ordonați după `formationPosition` (1-11) din Sportmonks:
- Position 1 = Goalkeeper
- Positions 2-5 = Defenders
- Positions 6-8 = Midfielders
- Positions 9-11 = Forwards

**Display**: Formația este inversată (GK la baza pitch-ului, atacanți sus).

## Folder boundaries (contract)

- `providers/sportmonks/*` NU importă nimic din UI.
- `client/overlays/*` NU importă nimic din SportMonks.
- Tipurile comune stau în `packages/shared`.

## Formate OBS

- 16:9: canvas 1920×1080, safe padding recomandat 60px
- 9:16: canvas 1080×1920, safe padding recomandat 48px

## Observații de performanță

- Evită “heavy effects” implicit (3D pitch). Fă-l toggle.
- Folosește font-uri locale (assets/fonts) pentru a evita flash/layout shift.
- Folosește tabular numbers pentru timp/scor.
