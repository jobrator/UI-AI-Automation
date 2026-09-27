# BUG-011 — Job detail apply control: stale `/subscription` href, and a malformed applied-jobs pagination request

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Type** | Frontend — wrong link target + malformed API URL |
| **Area** | Candidate → Job detail (`/jobs/<id>`) and Applied Jobs |
| **Affected tests** | none failing; both findings are latent (see "Corrected" below) |
| **Environment** | https://jobrator.com/, API https://api.jobrator.com/ |
| **Date found** | 2026-07-26 |
| **Status** | Open — low-risk latent defects |

## Corrected on 2026-07-27
An earlier revision of this report claimed the job detail page **never** reflects
the applied state, based on `TC_JOBS010` and `TC_J005` both failing. That claim was
**wrong** — it was a test defect, not a product defect. Both scenarios now pass:
the page does render "Applied" once the candidate has applied. The real cause was
the test opening the job with a hard `page.goto()`, which lands on an unhydrated
Next.js RSC shell with no apply control at all; a client-side click from `/jobs`
(or a reload) renders it correctly. Fixed in
`src/steps/public/browse_jobs.steps.ts` ("the candidate navigates to that job
detail page" now waits for the control, reloads, then falls back to a client-side
click).

Two smaller findings from the same investigation remain valid.

## Finding 1 — apply control's `href` points at `/subscription` even when subscribed
```json
{"tag":"A","text":"Apply For Job","href":"../subscription","vis":true}
```
The click handler opens the apply modal, so normal clicking works. But the `href`
is a stale no-JS fallback: middle-click, "open in new tab", Cmd/Ctrl-click, and
crawlers all land on the subscription page instead of the job application.

**Expected:** the control should be a `<button>`, or its `href` should point at the
job/apply route.

## Finding 2 — Applied Jobs fires a malformed pagination request on every load
```
200 GET https://api.jobrator.com/api/account/job-posts/applied/?page=1&sort=desc      ← correct
404 GET https://api.jobrator.com/api/account/job-posts/appliednull&sort=desc          ← malformed
    {"message":"E_ROUTE_NOT_FOUND: Cannot GET:/api/account/job-posts/appliednull&sort=desc"}
```
A `null` is concatenated straight into the URL (a missing `?page=` guard when
`nextPageUrl` is `null`). The first, well-formed request succeeds, so the list still
renders — this is wasted requests and log noise rather than a user-visible break.

**Expected:** no request when there is no next page.

## Suggested owner
Frontend — the apply control markup and the applied-jobs pagination URL builder.
