# SportMonks V3 docs bundle (local)

Acest folder este “single source of truth” pentru tot ce am strâns în chat despre **SportMonks API v3** și cum îl folosim în proiectul de overlays.

> Principiu important: **Livescores** și **Fixtures** consumă aceeași “requested_entity: Fixture” → evităm să facem două bucle de polling pe două endpoint-uri diferite pentru aceleași meciuri.

---

## 1) Ce avem documentat (prioritar pentru overlays)

### Fixtures / Livescores (entity: Fixture)
**Scop:** match list + live updates (score/state/minute/events/stats etc.)

- Note (includes/nested includes + strategy): `./notes/INCLUDES_VS_NESTED_INCLUDES.md`
- Strategy (rate limit + polling): `./notes/RATE_LIMIT_AND_POLLING_STRATEGY.md`
- Exemple de responses reale:
  - `./raw_responses/livescores-alllivevscores.txt`
  - `./raw_responses/fxitures-allfixtures.txt`
  - `./raw_responses/fixture-by-id-with-includes.json` (exemplu cu include + nested include)
  - `./raw_responses/fixture response.txt` (meci “terminat”, cu payload mare)

**Include-uri urmărite (subsetul tău):**
`round, stage, group, aggregate, league, season, coaches, venue, state, weatherReport, lineups, events, timeline, statistics, periods, metadata, sidelined, referees, formations, scores`

### Leagues / Seasons / Stages / Rounds / Groups
**Scop:** dropdown competiții, mapări league→seasons, schedule etc.

- Note: vezi `./raw_responses/leagues-all-leagues.txt` + `./notes/ARCHITECTURE.md` pentru flow
- Response: `./raw_responses/leagues-all-leagues.txt`

### Standings (normal + live standings)
**Scop:** widget standings / live standings (update mai rar, ex. 10s)

- Note: vezi `./raw_responses/standings-all-standings.txt` + `./notes/RATE_LIMIT_AND_POLLING_STRATEGY.md`
- Response: `./raw_responses/standings-all-standings.txt`

### States (fixture statuses)
**Scop:** UI status (NS/HT/FT etc.), filtre

- Doc: `./notes/STATES.md`

### Response codes / rate limits
- Doc: `./notes/RESPONSE_CODES.md`

### Types (nu există endpoint public dedicat)
- Fișierul primit (xlsx): `./types/Types_overview_API_V3.xlsx (copie safe) sau ./raw_responses/Types_overview API V3.xlsx (original)`
- Notă: acoperirea “types” depinde de sheet-urile incluse; vezi și `./types/README.md`

---

## 2) Unde sunt “prompt-urile” pentru implementare (Copilot / AI)

- `../prompts/` – prompturi etapizate (backend polling, caching, delta protocol, websocket, DTOs etc.)
- `../notes/` – decizii/assumptions, flow admin, widget-uri

Recomandare: când dai unui AI, începe cu `../prompts/00-overview.md` și urmează pașii în ordine.

---

## 3) Cum folosim datele în proiect

### Polling strategy (high level)
- **Loop live (1.5s):** doar pentru meciurile din *ticker* + *main match* (max ~20 ticker)
  - Ideal: `fixtures/multi/{ids}` (sau un endpoint unic stabilit) cu include-urile necesare
- **Loop standings (~10s):** `standings` (live standings by league id când e nevoie)
- **Loop “slow data” (rar):** leagues, seasons, etc. (cache)

### Delta protocol
Ținta este să nu trimitem payload-uri enorme prin WS către widget-uri, ci doar **differences**:
- scores/state/time/events/statistics updates
- patch-uri per fixture, per widget, per topic

Detaliile sunt în `../notes/delta-protocol.md` și prompturile din `../prompts/`.

---

## 4) Checklist: ce ar mai putea lipsi (în funcție de UI final)

- Odds / markets / predictions (dacă le veți folosi)
- Schedules (dacă vreți calendare pe sezon + team)
- Players/Teams endpoints (dacă trebuie profile/poze/rosters în UI)
- Commentary (dacă vreți “live commentary” text)
- TV stations (dacă afișați broadcaster)

Le adăugăm doar dacă devin necesare pentru widget-uri.
