# Defect register — Jobrator E2E suite

Bugs found while making the suite's data-dependent scenarios run for real instead
of skipping. Each file names the affected test IDs, so a red scenario can be
traced to a filed defect rather than being re-diagnosed.

| ID | Severity | Area | Affected tests | Status |
|----|----------|------|----------------|--------|
| [BUG-001](BUG-001-password-reset-email-not-delivered.md) | Medium | Auth — forgot password | `TC_PR001` | Open (intermittent) |
| [BUG-002](BUG-002-psychometric-exams-not-seeded.md) | Medium | Admin — psychometric tests | `TC_AT001`, `TC_AT003` | Seeded by `seed:full` |
| [BUG-003](BUG-003-candidate-account-api-500.md) | High | API `GET /account/candidate` | surfaced in `TC057`, `TC_PR001` | Open |
| [BUG-004](BUG-004-apply-without-cv-returns-500-with-misleading-message.md) | High | Candidate — apply modal | apply/journey seeding | Open |
| [BUG-005](BUG-005-interview-modal-has-no-format-field.md) | Low | Employer — schedule interview | `TC_SI002` | Feature file corrected |
| [BUG-006](BUG-006-shortlisted-card-omits-applied-job-title.md) | Medium | Employer — shortlisted CVs + all applicants | `TC_SI001`, `TC_AA001` | Open (tests red) |
| [BUG-007](BUG-007-cv-manager-has-no-social-share.md) | Medium | Candidate — CV manager | `TC056`, `TC057` | Open (tests red) |
| [BUG-008](BUG-008-cv-download-returns-404-json-instead-of-document.md) | High | Candidate — CV download | `TC058`, `TC059` | Open (tests red) |
| [BUG-009](BUG-009-job-alerts-has-no-create-or-delete.md) | Medium | Candidate — job alerts | `TC_SJ004`, `TC_SJ005`, `TC_SJ006` | Open (tests red) |
| [BUG-010](BUG-010-employment-type-has-no-internship-option.md) | Low | Employer — post job | `TC_PJ005` | Examples table trimmed |
| [BUG-011](BUG-011-job-detail-apply-control-issues.md) | Medium | Candidate — job detail / applied jobs | none (latent) | Open |
| [BUG-012](BUG-012-edit-job-status-draft-is-ignored.md) | High | Employer — edit job | `TC_MJ004` | Open (test red) |
| [BUG-013](BUG-013-vnin-verification-returns-null-auth-token.md) | **Critical** | Candidate — VNIN verification | `TC_VN002`, `TC_VN005` | Open (tests skipped — should be red) |
| [BUG-014](BUG-014-verification-provider-credentials-exposed-client-side.md) | **Critical (security)** | Candidate — VNIN verification | surfaced via `TC_VN002` | Open — rotate credentials |
| [BUG-015](BUG-015-ai-cv-generation-fails-on-upstream-503.md) | High | Candidate — AI CV generation | `TC070`, `TC071`, `TC072` | Open (tests flaky-red) |
| [BUG-016](BUG-016-no-brute-force-protection-on-login.md) | High (security) | Auth — login brute force | `TC019` | Open — retested 2026-08-17, not fixed |

## Conventions

- **"Open (test red)"** means the scenario asserts the correct behaviour and fails
  because of the defect. That is intentional — see
  `bugs/BUG-*` for the evidence and never soft-pass it back to green.
- **"Feature file corrected" / "Examples table trimmed"** means the test plan
  described something the product never shipped. The scenario now exercises the
  shipped behaviour strictly, with a comment pointing at the bug so the assertion
  can be restored when the feature lands.
- Environment data prerequisites live in `npm run seed:full`
  (and `npm run seed:subscription`, which must be run headed, once per billing
  period).
- **"skipped" is never an acceptable resting state.** A scenario that returns
  `'skipped'` reaches no verdict and hides whatever it was covering. BUG-013 was
  found underneath two skips labelled "environmental". Every skip needs a linked
  bug ID or a documented data dependency.

## Not defects — triaged and excluded

Red scenarios from the 2026-07-27 full run that were investigated and found
**not** to be product defects. Recorded so they are not re-diagnosed:

| Test | Finding |
|------|---------|
| `TC_CP004` | Test-data dependency. The shared candidate already has *Java, C#, PHP, JavaScript* selected, and react-select hides already-selected options — so searching "JavaScript" correctly yields "No options". The test must pick a skill not already on the profile. |
| `TC_EMSG003` | Unsatisfiable precondition. *"the employer account has no message threads"* only warns when threads exist and proceeds anyway; the seeded employer **has** threads, so the empty state legitimately cannot render. Needs a dedicated thread-free account or removal. |
| `TC_EREG012`, `TC_ACC006`, `TC_AJP002`, `TC_REG005` | **Flaky.** All four failed in the parallel full run and **all four passed** on a sequential re-run. No product defect identified; likely timing/parallelism. Re-check before filing. |
