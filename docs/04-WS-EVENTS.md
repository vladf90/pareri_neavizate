# Scop
Protocol WS simplu, tipizat, versionat, pentru:
- Admin -> Server: acțiuni (set match/theme/toggles)
- Server -> Client: broadcast state updates + status provider

## Conexiune
- WS URL: `ws://localhost:<SERVER_PORT>/ws`
- Client identifică rolul la connect: `admin` sau `overlay`

## Versionare
Fiecare mesaj include:
- `schemaVersion: 1`
- `type: string`
- `ts: number` (unix ms)
- `payload: object`

## Mesaje Admin -> Server

### 1) admin:hello
Payload:
- `role: "admin"`
- `clientId: string`
- `pin?: string`

### 2) admin:setMainMatch
Payload:
- `matchId: string | null`

### 3) admin:setTickerMatches
Payload:
- `matchIds: string[]`

### 4) admin:setTheme
Payload:
- `themeId: string`

### 5) admin:setOverlayToggles
Payload:
- `toggles: {
    showScoreboard?: boolean
    showTicker?: boolean
    showStats?: boolean
    showEventToasts?: boolean
    showSponsorBug?: boolean
    enable3DPitch?: boolean
  }`

### 6) admin:testEvent
Payload:
- `matchId?: string`
- `event: {
    kind: "GOAL" | "YELLOW" | "RED" | "SUB" | "VAR" | "INFO"
    team: "HOME" | "AWAY"
    label?: string
    player?: string
    minute?: number
  }`

## Mesaje Server -> Client

### 1) server:hello
Payload:
- `schemaVersion: 1`
- `serverTime: number`
- `state: AppState`

### 2) state:update
Payload:
- `state: AppState`

### 3) provider:status
Payload:
- `provider: "sportmonks" | "mock"`
- `status: "ok" | "degraded" | "down"`
- `message?: string`
- `lastSuccessAt?: number`

### 4) error
Payload:
- `code: string`
- `message: string`
- `details?: object`

## Overlay hello
Tip (Overlay -> Server): `overlay:hello`
Payload:
- `role: "overlay"`
- `clientId: string`
- `overlay: "hud" | "ticker" | "lineup"`
- `format: "16x9" | "9x16"`
