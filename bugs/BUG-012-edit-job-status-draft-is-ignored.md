# BUG-012 — Setting "Job Status" to Draft on the Edit Job form is silently ignored (no way to deactivate a job)

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Type** | Backend ignores a submitted field (silent data loss) |
| **Area** | Employer → Manage Jobs → Edit Job → "Job Status" |
| **Affected test** | `TC_MJ004` — *Employer can deactivate a job post which removes it from the public listing* |
| **Environment** | https://jobrator.com/dashboard/manage-jobs/<id>/edit, API https://api.jobrator.com/ |
| **Date found** | 2026-07-26 |
| **Status** | Open — test asserts real behaviour and fails |

## Summary
The Edit Job form exposes a **"Job Status"** select (`select[name="isDraft"]`,
`0 = Publish`, `1 = Draft`) — the only control anywhere for taking a live job out
of publication. Setting it to **Draft** and saving reports
**"Job Created Successfully!"**, but the change is **not persisted**: the job stays
`isDraft: false`, still reads "Published" in Manage Jobs, and remains on the public
`/jobs` listing.

Notably `POST` honours the same field while `PUT` does not — a job created with
**Publish Later** is stored with `isDraft: true` correctly.

## Steps to reproduce
1. Log in as an employer with a published job (e.g. id `625`).
2. **Manage Jobs → Edit Job**.
3. Change **Job Status** from `Publish` to `Draft`.
4. Click **Publish** (the form's save button).
5. Re-open the edit form and check Manage Jobs and `/jobs`.

## Expected
The job becomes a draft, shows "Draft" in Manage Jobs, and disappears from the
public listing.

## Actual
```
DOM value after selectOption:  isDraft = 1
PUT https://api.jobrator.com/api/account/job-posts?id=625
  request body contains an isDraft field
  → 200 {"success":true,"message":"Job Post updated successfully","data":{… "isDraft":false …}}
UI dialog: "Success! Job Created Successfully!"

after reload:  isDraft select = 0
Manage Jobs:   "…2026-07-26 2026-08-25 Published"   (no Draft row anywhere)
/jobs:         job 625 still listed
```

Contrast — the create path does respect it:
```
POST https://api.jobrator.com/api/account/job-posts   (via "Publish Later")
  → 200 {"message":"Job post created successfully","data":{… "isDraft":true …, "id":626}}
Manage Jobs:  "Publish Later Probe … Draft"
/jobs:        not listed
```

## Impact
- Employers **cannot unpublish or deactivate a job**. The only way to remove a live
  posting is to delete it, losing the post and its applications.
- The success dialog claims the update worked, so the failure is silent.
- The dialog also reads "Job **Created** Successfully" on an update.

## Test handling
`ManageJobsPage.deactivateJobViaEditForm()` drives the real control and
`TC_MJ004` asserts the job leaves the public listing, so the scenario fails on this
defect instead of skipping as "feature-unavailable".

## Suggested owner
Backend (`PUT /api/account/job-posts` must apply `isDraft`) + Frontend (success
message wording).
