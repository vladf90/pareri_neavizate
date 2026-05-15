# Obiectiv
Integrare SportMonks printr-un adapter care produce un model intern stabil:
- UI consumă doar Internal Models (Match/Events/Lineup/Stats).
- SportMonks poate fi schimbat ulterior fără rescriere UI.

## Config (env)
- `SPORTMONKS_BASE_URL`
- `SPORTMONKS_TOKEN`
- Poll intervals:
  - `POLL_MAIN_MATCH_MS` (ex: 2500)
  - `POLL_TICKER_MS` (ex: 5000)

## Provider contract (interfață internă)
SportMonksProvider trebuie să ofere:
- `searchFixtures(query)` (pentru Admin MatchPicker)
- `getMatchSnapshot(matchId)` (score + clock + teams)
- `getMatchEvents(matchId)` (goals/cards/sub/var)
- `getMatchLineups(matchId)` (starting XI + formation)
- `getMatchStats(matchId)` (possession, shots etc. dacă există)

## Polling plan
### A) Main match poller
Interval: `POLL_MAIN_MATCH_MS`
Fetch (minimal first):
1) snapshot (score/clock)
2) events (dacă `lastEventId` s-a schimbat sau periodic, ex: la 10s)
3) stats (la 5–10s, mai rar)
4) lineups (o singură dată când devin disponibile sau la schimbare)

### B) Ticker poller
Interval: `POLL_TICKER_MS`
Fetch:
- snapshot pentru fiecare matchId din ticker list
Optimizare:
- batch dacă SportMonks permite; altfel paralel cu limită (concurrency=3)

## Rate limit & backoff
- Dacă primești 429/5xx:
  - marchează provider status: degraded
  - crește intervalul temporar (max 30s)
  - retry cu jitter
- Dacă succes:
  - revino gradual la intervalul normal

## Cache & de-dup
- Stochează `lastHash` per match snapshot/events/stats.
- Dacă hash identic: nu emite state:update inutil.

## Mapping (SportMonks -> Internal)
Reguli:
- Normalizează echipe: `Team { id, name, shortName, crestUrl?, colors? }`
- Clock:
  - minute (number)
  - phase (1H/HT/2H/ET/PEN/FT)
  - isLive (boolean)
- Events:
  - kind: GOAL/YELLOW/RED/SUB/VAR/INFO
  - minute
  - teamSide (HOME/AWAY)
  - unique id (stabil)

## Stale handling (când API cade)
- Păstrează `lastKnownState`.
- Setează `provider:status = degraded/down`.
- UI afișează discret “DATA DELAYED” (nu bloca overlay-ul).

## Admin MatchPicker (căutare)
- Recomandat:
  - select competiție + dată
  - listă fixtures cu kickoff time
- Provider oferă `searchFixtures` care returnează:
  - matchId, teams, startAt, competition, status

Notă: endpoint-urile exacte SportMonks pot varia în funcție de plan; adapterul trebuie să fie singurul loc unde “știm” cum arată răspunsurile lor.
