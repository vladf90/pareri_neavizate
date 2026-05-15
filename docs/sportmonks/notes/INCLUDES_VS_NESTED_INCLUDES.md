# Includes vs nested includes

Sportmonks uses `include=` to enrich a base entity with related entities.

## Includes
An **include** adds a direct relationship to the response.

Example:
- `include=participants;venue;scores`

That returns `participants`, `venue`, `scores` as top-level fields on the fixture.

## Nested includes
A **nested include** traverses further relationships *within* an included entity.

Example:
- `include=lineups.player;statistics.type;events.subType`

Meaning:
- `lineups` is included, and for each lineup item, also include the related `player`
- `statistics` is included, and for each statistic item, include its `type`
- `events` is included, and for each event, include its `subType`

### Practical notes
- Nested includes increase payload size quickly.
- Some endpoints have an "include depth" limit (often 3).
- For performance: prefer `include` for UI-level needs, and only add nested includes when you need details that aren't available on the base include.

