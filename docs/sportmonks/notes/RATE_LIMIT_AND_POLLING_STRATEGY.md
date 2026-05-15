# Rate-limit & polling strategy for overlays

## Key constraint
Sportmonks rate-limits per hour, and multiple endpoints may count against the same underlying entity quota.
Example: `livescores` and `fixtures` both return the **Fixture** entity, so treat them as sharing the same budget.

## Goal
Avoid requesting the same entity in multiple places at different frequencies.

## Proposed polling layers

### 1) Fast loop (1.5s–3s)
Used only for what must feel live:
- Main match ticker/events (for the currently selected main fixture)
- Minimal fields for ticker matches (state, minute/score)

**Implementation idea**
- Request a single `fixtures/multi/{ids}` for `mainFixtureId + tickerFixtureIds`.
- Use small include set for ticker; optionally add a second "details" tier for main match (but keep it as a *single call* if possible).

### 2) Medium loop (10s)
Used for:
- Live standings (if you need live changes)
- Expanded match stats

### 3) Slow loop (60s–300s)
Used for:
- Leagues list
- Fixtures for selected date/competition
- Season data, venues, etc.

## Payload control for ticker
- Limit ticker to max 20 fixtures (as you said).
- Use `select=` to restrict base fields.
- Use only the includes you actually render.

