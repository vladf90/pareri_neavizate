# Scop
Definim un **model intern stabil** (Internal Models) folosit peste tot în aplicație:
- Server: stochează `AppState` și îl trimite către clienți
- Client: randare overlays + admin UI
- Provider (SportMonks): doar mapează din răspunsurile SportMonks în aceste modele

Regulă: **UI nu importă niciodată tipuri SportMonks**.

---

## 1) Convenții generale
- Toate ID-urile sunt `string`.
- Timpurile sunt `unix ms` (number) în starea globală.
- Numericele care se afișează (time/score) trebuie să fie stabile (tabular-nums în UI).
- Pentru evenimente, păstrăm un `id` stabil ca să putem:
  - detecta evenimente noi
  - afișa toast doar o singură dată
  - evita duplicate la polling

---

## 2) Tipuri de bază

### Identificatori
- `MatchId`, `TeamId`, `PlayerId`, `CompetitionId` sunt alias-uri de string.

### Side (home/away)
- `TeamSide = "HOME" | "AWAY"`

### Status match / faze
- `MatchStatus = "NS" | "LIVE" | "HT" | "FT" | "AET" | "PEN" | "SUSP" | "POST" | "CANC" | "ABD"`

### Phase clock (simplificat)
- `ClockPhase = "PRE" | "1H" | "HT" | "2H" | "ET1" | "ETHT" | "ET2" | "PEN" | "FT"`

---

## 3) Entități

### Competition
- `id: CompetitionId`
- `name: string`
- `shortName?: string`
- `country?: string`
- `season?: { id: string; name?: string }`

### Team
- `id: TeamId`
- `name: string`
- `shortName: string` (ex: RMA, BAR)
- `crestUrl?: string`
- `colors?: { primary?: string; secondary?: string }`

### MatchClock
- `phase: ClockPhase`
- `minute: number` (0..130)
- `addedMinute?: number` (ex: +3 => 3)
- `display: string` (ex: "45+3", "12", "HT")
- `isLive: boolean`
- `lastUpdatedAt: number` (unix ms)

### Score
- `home: number`
- `away: number`

### PenaltyScore (opțional)
- `home: number`
- `away: number`

### Venue (opțional)
- `name?: string`
- `city?: string`
- `country?: string`

---

## 4) Match (snapshot)
`Match` este “documentul principal” pentru un meci.

Câmpuri:
- `id: MatchId`
- `competition: Competition`
- `startTime: number` (unix ms)
- `status: MatchStatus`
- `venue?: Venue`

- `homeTeam: Team`
- `awayTeam: Team`

- `score: Score`
- `penalties?: PenaltyScore`
- `clock: MatchClock`

- `lastChangedAt: number` (unix ms)
  (folosit pentru detectarea modificărilor fără să compari deep object în UI)

---

## 5) Events (goals/cards/sub/VAR)

### EventKind
- `"GOAL" | "OWN_GOAL" | "PENALTY_GOAL" | "MISS_PEN" | "YELLOW" | "RED" | "SECOND_YELLOW" | "SUB" | "VAR" | "INFO"`

### MatchEvent
- `id: string` (stabil; compus din providerId sau hash determinist)
- `matchId: MatchId`
- `kind: EventKind`
- `teamSide: TeamSide`
- `minute: number`
- `addedMinute?: number`
- `displayMinute: string` (ex: "90+2")
- `timestamp?: number` (unix ms dacă există)
- `player?: { id?: PlayerId; name: string }`
- `assist?: { id?: PlayerId; name: string }`
- `replacedPlayer?: { id?: PlayerId; name: string }` (pentru SUB)
- `detail?: string` (ex: "Handball", "Offside", "Penalty")
- `scoreAfter?: Score` (opțional, util pentru toast)

---

## 6) Lineups

### PositionCode (simplificat)
- `"GK" | "DF" | "MF" | "FW"`

### LineupPlayer
- `id?: PlayerId`
- `name: string`
- `number?: number`
- `position?: PositionCode`
- `role?: "STARTER" | "SUB" | "BENCH"`
- `photoUrl?: string`
- `formationPosition?: number` 🆕 (1-11, indicates exact spot in tactical formation)
- `x?: number` (0..100)
- `y?: number` (0..100)

### TeamLineup
- `teamSide: TeamSide`
- `teamName?: string` 🆕 (for widget display)
- `formation?: string` (ex: "4-3-3")
- `startingXI: LineupPlayer[]`
- `bench?: LineupPlayer[]`

### MatchLineups
- `matchId: MatchId`
- `home: TeamLineup`
- `away: TeamLineup`
- `lastUpdatedAt: number`

---

## 7) Stats (minim v1, extensibil)

### StatsKey (extensibil)
- `"possession" | "shots_total" | "shots_on_target" | "corners" | "fouls" | "xg" | "passes" | "passes_accuracy"`

### MatchStats
- `matchId: MatchId`
- `home: Partial<Record<StatsKey, number>>`
- `away: Partial<Record<StatsKey, number>>`
- `lastUpdatedAt: number`

---

## 8) Overlay State (UI-specific)

### Theme
- `themeId: string` (ex: UCL, PL)
- `variant?: string`

### OverlayFormat
- `"16x9" | "9x16"`

### Toggles
- `showScoreboard: boolean`
- `showTicker: boolean`
- `showStats: boolean`
- `showEventToasts: boolean`
- `showSponsorBug: boolean`
- `enable3DPitch: boolean`
- `showStandings: boolean` 🆕 (Master Overlay widget)
- `showH2H: boolean` 🆕 (Master Overlay widget)
- `showForm: boolean` 🆕 (Master Overlay widget)
- `showTopScorers: boolean` 🆕 (Master Overlay widget)
- `showLineupsHome: boolean` 🆕 (Master Overlay widget)
- `showLineupsAway: boolean` 🆕 (Master Overlay widget)
- `showLiveStandings: boolean` 🆕 (Master Overlay widget)

---

## 9) AppState (source of truth)
`AppState` este snapshot-ul pe care serverul îl trimite în `server:hello` și `state:update`.

- `schemaVersion: 1`
- `updatedAt: number` (unix ms)

- `provider: {
    name: "sportmonks" | "mock"
    status: "ok" | "degraded" | "down"
    message?: string
    lastSuccessAt?: number
  }`

- `selection: {
    mainMatchId: MatchId | null
    tickerMatchIds: MatchId[]
    themeId: string
    toggles: Toggles
  }`

- `data: {
    mainMatch?: Match
    tickerMatches: Match[]
    events: MatchEvent[]
    lineups?: MatchLineups
    stats?: MatchStats
  }`

- `ui: {
    operatorNotes?: string
  }`

---

## 10) Extensibilitate (principii)
- Adaugă câmpuri noi în `data` fără să strici overlay-urile:
  - overlay-urile trebuie să trateze `undefined` elegant.
- `schemaVersion` permite migrare pe viitor.
- Evenimentele WS pot trimite mereu snapshot complet (v1). Dif-uri sunt opționale (v2).
