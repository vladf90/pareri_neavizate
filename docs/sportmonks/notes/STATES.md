# Fixture states (Sportmonks API v3)

A fixture moves through several statuses during its lifecycle, from scheduled to finished (or cancelled). States are identified by both:
- a numeric `state_id`
- a string `state` code (e.g. `NS`, `HT`, `FT`)

You can retrieve the full list programmatically:

`GET /v3/football/states?api_token=YOUR_TOKEN`

## State reference (commonly used)

| ID | Name | State code | Notes |
|---:|---|---|---|
| 1 | Not Started | NS | Scheduled, not kicked off |
| 2 | 1st Half | INPLAY_1ST_HALF | Live |
| 3 | Half-Time | HT | Interval |
| 22 | 2nd Half | INPLAY_2ND_HALF | Live |
| 5 | Full-Time | FT | Finished after 90 minutes (may appear briefly before extra time) |
| 4 | Regular Time Finished | BREAK | Waiting for extra time |
| 6 | Extra Time | INPLAY_ET | Live extra time |
| 21 | Extra Time Break | EXTRA_TIME_BREAK | Between ET halves |
| 7 | Finished After Extra Time | AET | Finished after 120 minutes |
| 25 | Penalties Break | PEN_BREAK | Waiting for penalties |
| 9 | Penalty Shootout | INPLAY_PENALTIES | Live penalties |
| 8 | Full-Time After Penalties | FT_PEN | Finished after penalties |
| 10 | Postponed | POSTPONED | Rescheduled |
| 11 | Suspended | SUSPENDED | Will continue later |
| 12 | Cancelled | CANCELLED | Permanently cancelled |
| 15 | Abandoned | ABANDONED | Abandoned; may resume later |
| 16 | Delayed | DELAYED | Kick-off delayed |
| 18 | Interrupted | INTERRUPTED | Temporarily stopped (e.g., weather) |
| 19 | Awaiting Updates | AWAITING_UPDATES | Temporary state due to data/connectivity delay |
| 20 | Deleted | DELETED | Not returned in standard calls unless `deleted=1` |
| 26 | Pending | PENDING | Awaiting verification / data |

## Practical UI mapping ideas

- If `state` is `NS`: show scheduled time (no timer).
- If in-play states: show minute/second if provided, otherwise fall back to period + elapsed minutes.
- If `HT`, `FT`, `AET`, `FT_PEN`: show the code as the primary label.

