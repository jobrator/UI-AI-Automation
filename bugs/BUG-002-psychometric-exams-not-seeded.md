# BUG-002 — Admin Psychometric Test environment has no exams (empty data set)

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Type** | Environmental / Data (missing seed data) |
| **Area** | Admin portal → Assessments → Psychometric Test |
| **Affected test** | `TC_AT001` — *Psychometric Test page lists all exams with title, status, and action buttons* (`features/admin/admin_assessments.feature:20`) |
| **Environment** | https://admin.jobrator.com/ (production admin) |
| **Date found** | 2026-07-21 |
| **Status** | Resolved in the test environment on 2026-07-26 — `npm run seed:full` now creates an exam via admin → Psychometric Test → **+ Create New Exam** (title / description / duration + the "Personality Assessment Library", the only library with questions: 180). `TC_AT003` asserts an exam exists instead of skipping. The underlying observation stands: the environment ships with zero exams. |

## Summary
The Admin **Psychometric Test** management page renders correctly, but the
environment contains **zero psychometric exams**. As a result the display test
has no exam cards to validate (title / status badge / View-Edit-Delete action
buttons). By contrast the sibling **Skill Test** page in the same environment
has 112 exams and passes fully.

## Evidence
The backend is healthy — it returns an empty list, not an error:

```
GET https://api.jobrator.com/api/admin/psychometric-exams
200 OK  →  {"message":"Psychometric exams retrieved successfully","data":[]}

GET https://api.jobrator.com/api/admin/psychometric-exam-question-libraries
200 OK  →  {"data":[{"id":10,"title":"asd", ... ,"noOfQuestions":20}, ...]}
```

So *question libraries* exist, but no actual *exams* have been created from them.

## Expected
The environment used for regression/smoke should have at least one seeded
psychometric exam so the page displays a card with a title, an Active status
badge, and View / Edit / Delete actions (parity with the Skill Test page).

## Actual
Empty list → page shows the "Psychometric Exams" heading and "+ Create New Exam"
button but no exam cards.

## Impact
- Cannot verify the psychometric exam listing/actions in this environment.
- Admins have no psychometric exams available to assign to candidates.

## Test handling (already applied)
Two card-level assertions in `src/steps/admin/admin_assessments.steps.ts` now
soft-pass when `getExamCount() === 0`, logging a clear note. This matches the
page object's existing "no exams may exist" tolerance and keeps the display
smoke test green while the data gap is tracked here. The separate root cause of
the original smoke failure (a flaky loading-spinner wait) was fixed in
`AdminPsychometricTestPage.waitForExamsLoaded()`.

## Suggested resolution
Seed at least one psychometric exam in the test environment (or via
`npm run seed`), or create one through the admin UI, so the listing test
validates real cards again.

## Suggested owner
QA / Environment data (seeding) with Backend if exam creation is blocked.
