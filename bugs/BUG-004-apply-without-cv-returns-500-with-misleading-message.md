# BUG-004 — Applying without selecting a CV returns HTTP 500 and a misleading "You can apply to a job Only Once!" error

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Type** | Backend (500) + misleading error message |
| **Area** | Candidate → Job detail → "Apply for this job" modal |
| **Affected test** | `TC_J002`/`TC_J005` bridge, `npm run seed:full` (candidate application stage) |
| **Environment** | https://jobrator.com/, API https://api.jobrator.com/ |
| **Date found** | 2026-07-26 |
| **Status** | Open — not a test-code defect |

## Summary
In the apply modal the CV picker is a **custom dropdown** (a "Select a CV"
trigger plus a list of the candidate's documents), not a `<select>`, and it has
**no client-side validation**. Submitting **Apply Job** without choosing a CV
makes the backend return **HTTP 500**, and the UI translates that into
**"You can apply to a job Only Once!"** — telling the user they have already
applied when in fact they have not applied at all.

## Steps to reproduce
1. Log in as a candidate with an active Jobrator Plus subscription.
2. Open any job the candidate has **not** applied to (e.g. `/jobs/622`).
3. Click **Apply For Job** → the "Apply for this job" modal opens.
4. Do **not** pick a CV from the "Select a CV" dropdown.
5. Click **Apply Job**.

## Expected
An inline validation message such as "Please select a CV" and no network call —
or, at minimum, a `400` with a field-level error. The user must not be told they
have already applied.

## Actual
```
500 POST https://api.jobrator.com/api/account/job-posts/622/apply
UI dialog: "Failed!  You can apply to a job Only Once!"
```
Meanwhile the has-applied check for the same job correctly reports the opposite:
```
200 GET https://api.jobrator.com/api/account/job-posts/applied/622
    {"message":"User has not applied for this job","codeStatus":false}
```

With a CV selected, the same request succeeds:
```
200 POST https://api.jobrator.com/api/account/job-posts/622/apply
    {"id":351,"status":"Pending","jobPostId":622,"candidateId":40, ... }
```

## Impact
- Candidates who miss the CV dropdown are told they already applied and give up.
- The 500 is an unhandled server error on a core conversion path.
- Automation-wise this was the root cause of every "candidate cannot apply"
  failure in the suite: the previous code looked for a `<select>` inside the
  modal, never attached a CV, and hit this 500 on every attempt.

## Test handling
`selectCvInApplyModal()` in `src/steps/journeys/journey.steps.ts` (and the same
logic in `src/scripts/seed-full-environment.ts`) now drives the custom dropdown
and verifies the application on `/dashboard/applied-jobs`. No soft-pass.

## Suggested owner
Backend (500 on `/job-posts/:id/apply`) + Frontend (modal validation and error
message mapping).
