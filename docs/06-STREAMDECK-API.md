# Stream Deck GFX API

API endpoints for controlling broadcast graphics via Stream Deck or any HTTP client.

**Base URL:** `http://localhost:3001`

---

## Overview

The GFX API allows you to:
- Get current state of all graphics
- Enable/disable individual graphics
- Toggle graphics on/off
- Update multiple graphics at once
- Trigger one-shot effects (like goal alerts)
- Reset all graphics to defaults

All state changes are automatically broadcast to connected overlays via WebSocket.

---

## Available GFX Elements

### Master Overlay (`category: master`)
| Key | Label | Description | Default |
|-----|-------|-------------|---------|
| `showMasterScoreboard` | Scoreboard | Main match scoreboard HUD | ✅ enabled |
| `showMasterLineupsHome` | Lineups Home | Home team lineup panel | ❌ disabled |
| `showMasterLineupsAway` | Lineups Away | Away team lineup panel | ❌ disabled |
| `showMasterTicker` | Live Ticker | Bottom ticker with other matches | ✅ enabled |
| `showMasterSocials` | Socials | Instagram handles rotation | ✅ enabled |
| `showMasterBranding` | Branding | Pareri Neavizate brand popup | ✅ enabled |

### Standalone Overlays (`category: standalone`)
| Key | Label | Description | Default |
|-----|-------|-------------|---------|
| `showStandings` | Standings | League table overlay | ❌ disabled |
| `showLiveStandings` | Live Standings | Live league table with current results | ❌ disabled |
| `showH2H` | Head to Head | H2H comparison overlay | ❌ disabled |
| `showTopScorers` | Top Scorers | Season top scorers overlay | ❌ disabled |
| `showStats` | Match Stats | Live match statistics | ❌ disabled |
| `showForm` | Form Guide | Team form comparison | ❌ disabled |
| `showStartingSoon` | Starting Soon | Pre-match countdown overlay | ❌ disabled |

### Effects (`category: effect`)
| Key | Label | Description | Default |
|-----|-------|-------------|---------|
| `triggerGoalAlert` | Goal Alert | Trigger goal celebration animation | ❌ disabled |

---

## Endpoints

### GET /api/gfx
Get all GFX elements with current state.

**Response:**
```json
{
  "gfx": [
    {
      "key": "showMasterScoreboard",
      "label": "Scoreboard",
      "description": "Main match scoreboard HUD",
      "category": "master",
      "defaultEnabled": true,
      "enabled": true
    }
    // ... more elements
  ],
  "categories": {
    "master": [...],
    "standalone": [...],
    "effect": [...]
  }
}
```

---

### GET /api/gfx/:key
Get single GFX element state.

**Example:** `GET /api/gfx/showMasterScoreboard`

**Response:**
```json
{
  "key": "showMasterScoreboard",
  "label": "Scoreboard",
  "description": "Main match scoreboard HUD",
  "category": "master",
  "defaultEnabled": true,
  "enabled": true
}
```

---

### POST /api/gfx/:key/enable
Enable a GFX element.

**Example:** `POST /api/gfx/showMasterLineupsHome/enable`

**Response:**
```json
{
  "key": "showMasterLineupsHome",
  "enabled": true,
  "message": "Lineups Home enabled"
}
```

---

### POST /api/gfx/:key/disable
Disable a GFX element.

**Example:** `POST /api/gfx/showMasterLineupsHome/disable`

**Response:**
```json
{
  "key": "showMasterLineupsHome",
  "enabled": false,
  "message": "Lineups Home disabled"
}
```

---

### POST /api/gfx/:key/toggle
Toggle a GFX element on/off.

**Example:** `POST /api/gfx/showMasterScoreboard/toggle`

**Response:**
```json
{
  "key": "showMasterScoreboard",
  "enabled": false,
  "message": "Scoreboard disabled"
}
```

---

### PATCH /api/gfx
Update multiple GFX elements at once.

**Request Body:**
```json
{
  "toggles": {
    "showMasterScoreboard": true,
    "showMasterLineupsHome": true,
    "showMasterLineupsAway": true,
    "showMasterTicker": false
  }
}
```

**Response:**
```json
{
  "message": "Updated 4 GFX elements",
  "toggles": {
    "showMasterScoreboard": true,
    "showMasterLineupsHome": true,
    "showMasterLineupsAway": true,
    "showMasterTicker": false,
    // ... other toggles
  }
}
```

---

### POST /api/gfx/reset
Reset all GFX elements to default values.

**Response:**
```json
{
  "message": "All GFX reset to defaults",
  "toggles": {
    "showMasterScoreboard": true,
    "showMasterLineupsHome": false,
    // ... all defaults
  }
}
```

---

### POST /api/gfx/trigger/:key
Trigger a one-shot effect that auto-disables after duration.

**Request Body (optional):**
```json
{
  "duration": 5000
}
```

**Example:** `POST /api/gfx/trigger/triggerGoalAlert`

**Response:**
```json
{
  "key": "triggerGoalAlert",
  "triggered": true,
  "duration": 5000,
  "message": "Goal Alert triggered for 5000ms"
}
```

---

## Stream Deck Configuration

### Recommended Button Setup

Use **Website** action type with these URLs:

| Button | Action | URL |
|--------|--------|-----|
| 🏟️ Scoreboard | Toggle | `POST http://localhost:3001/api/gfx/showMasterScoreboard/toggle` |
| 👕 Lineups Home | Toggle | `POST http://localhost:3001/api/gfx/showMasterLineupsHome/toggle` |
| 👕 Lineups Away | Toggle | `POST http://localhost:3001/api/gfx/showMasterLineupsAway/toggle` |
| 📊 Ticker | Toggle | `POST http://localhost:3001/api/gfx/showMasterTicker/toggle` |
| 📷 Socials | Toggle | `POST http://localhost:3001/api/gfx/showMasterSocials/toggle` |
| 🎯 Goal Alert | Trigger | `POST http://localhost:3001/api/gfx/trigger/triggerGoalAlert` |
| 🔄 Reset All | Reset | `POST http://localhost:3001/api/gfx/reset` |

### Using cURL

```bash
# Toggle scoreboard
curl -X POST http://localhost:3001/api/gfx/showMasterScoreboard/toggle

# Enable lineups
curl -X POST http://localhost:3001/api/gfx/showMasterLineupsHome/enable

# Trigger goal alert for 8 seconds
curl -X POST http://localhost:3001/api/gfx/trigger/triggerGoalAlert \
  -H "Content-Type: application/json" \
  -d '{"duration": 8000}'

# Batch update
curl -X PATCH http://localhost:3001/api/gfx \
  -H "Content-Type: application/json" \
  -d '{"toggles": {"showMasterScoreboard": true, "showMasterTicker": false}}'
```

### Using PowerShell

```powershell
# Toggle scoreboard
Invoke-RestMethod -Uri "http://localhost:3001/api/gfx/showMasterScoreboard/toggle" -Method POST

# Get all GFX state
Invoke-RestMethod -Uri "http://localhost:3001/api/gfx" | ConvertTo-Json -Depth 5

# Trigger goal alert
Invoke-RestMethod -Uri "http://localhost:3001/api/gfx/trigger/triggerGoalAlert" -Method POST -Body '{"duration": 5000}' -ContentType "application/json"
```

---

## Architecture Notes

1. **State Persistence**: All toggle changes are persisted to `data/state.json`
2. **WebSocket Sync**: Changes trigger `server:stateUpdate` to all connected clients
3. **Extensibility**: Add new GFX by updating `GFX_REGISTRY` in `packages/shared/src/models.ts`
4. **Rate Limiting**: API endpoints are rate-limited (see middleware config)

---

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid request body or GFX key |
| 404 | GFX element not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

```json
{
  "error": "GFX element 'invalidKey' not found"
}
```
