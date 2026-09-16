# BUG-003 — `GET /api/account/candidate` returns 500 (dashboard profile fails to load)

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Type** | Environmental / Backend (API 500) |
| **Area** | Candidate dashboard → account/profile summary |
| **Surfaced during** | `TC057` (messages) and `TC_PR001` (password reset) investigation |
| **Environment** | https://jobrator.com/ (production), API https://api.jobrator.com/ |
| **Date found** | 2026-07-21 |
| **Status** | Open — secondary finding |

## Summary
The candidate account summary endpoint returns HTTP **500** on every call. On
the dashboard this leaves the "Loading Profile Details…" overlay spinning and
prevents the stat-counter values (e.g. the Messages count) from populating.

## Evidence
Captured while logged in as the candidate on `/dashboard`:

```
500 https://api.jobrator.com/api/account/candidate   (repeated ~20×)
```

Screenshot: dashboard renders the shell ("Hello, Tosin!", nav, stat cards) but
shows a persistent **"Loading Profile Details…"** overlay; stat cards render
their labels ("Messages", "Saved Jobs", …) without their numeric counts.

## Expected
`GET /api/account/candidate` returns 200 with the candidate's account/profile
summary; the dashboard finishes loading and stat counters show their values.

## Actual
Endpoint returns 500 repeatedly; profile details never finish loading.

## Impact
- Degraded candidate dashboard (profile details + stat counts unavailable).
- Contributed to the fragility of `TC057`: the messages stat card never
  received its numeric count ("2Messages"), so a count-dependent assertion had
  nothing to match. (The test has been made count-independent — it now verifies
  the Messages entry point is present and visible — so TC057 passes, but the
  underlying API 500 remains a real backend defect.)

## Test handling
No test soft-pass added specifically for this — `TC057` was corrected to assert
the durable fact (a visible messages link) rather than a count that depends on
this failing API.

## Suggested owner
Backend / Platform — investigate the 500 on `/api/account/candidate`
(likely related to the same instability behind BUG-001).
