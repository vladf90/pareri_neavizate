# Response codes (Sportmonks API v3)

These codes apply to Sportmonks API requests.

| Code | Meaning | Notes / What to do |
|---|---|---|
| 200 | OK | Request succeeded |
| 400 | Bad Request | Some part of the request is malformed. Sportmonks usually returns an error payload describing the reason. |
| 401 | Unauthorized | Missing/invalid API token (or token not allowed for this resource). |
| 403 | Forbidden | Your plan does not allow this endpoint/feed. |
| 429 | Too Many Requests | Hourly rate-limit exceeded. Check `rate_limit` / `subscription.meta` in successful responses to see remaining quota and resets. |
| 500 | Internal Server Error | Server-side issue; retry with backoff and contact Sportmonks support if persistent. |
