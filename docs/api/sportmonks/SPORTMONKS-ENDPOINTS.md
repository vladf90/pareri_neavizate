# SportMonks – Endpoints Used (v1)

## Scope
This document defines which SportMonks Football API v3 endpoints are used in v1 of the watchalong application.

UI and AppState NEVER depend directly on SportMonks responses.

---

## Endpoints Used (v1)

### Fixtures (Main match + ticker)
GET /v3/football/fixtures/{fixtureId}

Includes:
- participants
- scores
- state
- venue
- league
- season

---

### Livescores (Ticker)
GET /v3/football/livescores

Used for:
- multi-match ticker updates

---

### Events
GET /v3/football/fixtures/{fixtureId}/events

Used for:
- goals
- cards
- VAR
- substitutions

---

### Lineups
GET /v3/football/fixtures/{fixtureId}/lineups

---

### Statistics
GET /v3/football/fixtures/{fixtureId}/statistics

---

## Excluded in v1
- Odds
- Predictions
- Widgets
- Tracking / Heatmaps
