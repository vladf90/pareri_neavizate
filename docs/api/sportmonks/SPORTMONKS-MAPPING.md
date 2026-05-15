# SportMonks → Internal Model Mapping (v1)

## Goal
Map SportMonks Football API v3 into the Internal Model defined in shared/models.ts

---

## Team Mapping
SportMonks:
- participants[].id
- participants[].name
- participants[].short_code
- participants[].image_path

Internal:
- Team.id
- Team.name
- Team.shortName
- Team.crestUrl

---

## Match Mapping
SportMonks:
- fixture.id
- fixture.starting_at
- fixture.state.state

Internal:
- Match.id
- Match.startTime
- Match.status

---

## Score Mapping
SportMonks:
- scores[].score.goals

Internal:
- Match.score.home
- Match.score.away

---

## Event Mapping
SportMonks:
- events[].type
- events[].minute
- events[].player_name

Internal:
- MatchEvent.kind
- MatchEvent.minute
- MatchEvent.player.name
