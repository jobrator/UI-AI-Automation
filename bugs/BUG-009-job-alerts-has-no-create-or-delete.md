# BUG-009 — "Job Alerts" is a read-only notification feed: no keyword alert creation and no delete

| Field | Value |
|-------|-------|
| **Severity** | Medium (feature absent) |
| **Type** | Feature not implemented vs. test plan |
| **Area** | Candidate → Dashboard → Job Alerts |
| **Affected tests** | `TC_SJ004` — *create a new job alert with keyword and location*; `TC_SJ005` — *alert creation fails when required fields are empty*; `TC_SJ006` — *delete an existing job alert* |
| **Environment** | https://jobrator.com/dashboard/job-alerts |
| **Date found** | 2026-07-26 |
| **Status** | Open — tests assert real behaviour and fail |

## Summary
The test plan describes keyword+location **job alert subscriptions** the candidate
can create, validate and delete. What the product ships under "Job Alerts" is a
**read-only feed of per-job notifications**. There is no create form anywhere in
the app and no delete control on the list.

## Evidence
`/dashboard/job-alerts` — 78 records, zero form controls:
```
inputs:    []
buttons:   ["View Job" × 10]
data-text: ["View Job"]
```
```
200 GET https://api.jobrator.com/api/account/job-alerts/?page=1&limit=10
{"meta":{"total":78,…},"data":[{"id":2431,"candidateId":40,"jobId":623,
  "companyId":380,"status":"unread", …}]}
```
Each record is tied to a **specific `jobId`/`companyId` with a read/unread
status** — i.e. a notification, not a saved search. The count matches the header's
"78 unread notifications" badge exactly.

Swept for an alert-creation entry point elsewhere and found none:
`/jobs`, `/` (home) and `/dashboard/saved-jobs` contain no control matching
`alert|notify|subscribe`, only links back to `/dashboard/job-alerts` and
`/dashboard/notifications`.

## Expected
Per the test plan: a form taking a keyword and a location, validation when
submitted empty, and a delete action per saved alert.

## Actual
Read-only list with a single "View Job" action per row.

## Test handling
The three "feature-unavailable" skips in
`src/steps/candidate/saved_jobs.steps.ts` are now assertions naming this bug, so
the scenarios fail visibly rather than vanishing from the report.

## Suggested owner
Product — confirm whether keyword job alerts are still in scope (and whether the
"Job Alerts" label should be "Notifications"); then Frontend/Backend.
