# BUG-006 — Shortlisted CVs entry does not show the job the candidate applied to

| Field | Value |
|-------|-------|
| **Severity** | Medium (usability) |
| **Type** | Missing data on screen |
| **Area** | Employer → Shortlisted CVs **and** All Applicants |
| **Affected tests** | `TC_SI001` — *Shortlisted CVs page lists all shortlisted candidates with required details*; `TC_AA001` — *All Applicants page lists applications across all employer job posts* |
| **Environment** | https://jobrator.com/dashboard/shortlisted-resumes |
| **Date found** | 2026-07-26 |
| **Status** | Open — test asserts real behaviour and fails |

## Summary
A shortlisted candidate card shows the candidate name, location and skill tags,
but **not the job they applied to**. An employer hiring for several roles cannot
tell which vacancy a shortlisted candidate belongs to without changing the
"All Jobs" filter and comparing lists.

## Evidence
Rendered card (trimmed):
```html
<div class="candidate-block-three ...">
  <figure class="image"><img src="/images/human_capital_logo.png"></figure>
  <h4 class="name"><a href="/candidate/40">Tosin Adeleye</a>
    <ul class="option-list">… data-text="Reschedule Interview" …</ul>
  </h4>
  <ul class="shortListedCandidate-info"><li>… Not available</li></ul>  <!-- location only -->
  <ul class="post-tags"><li><a>Java</a></li><li><a>C#</a></li>…</ul>
</div>
```
There is no job-title node. The association exists in the data —
`GET /api/account/applicants/application-status/Shortlisted/?page=1` returns
`{"id":351,"status":"Shortlisted","jobPostId":622,"candidateId":40, …}` — it is
simply not rendered.

Note the location also renders the placeholder **"Not available"** even though the
candidate profile has an address, which is likely a second, smaller defect on the
same card.

## Expected
Each shortlisted entry displays the applied job title (as the All Applicants page
does).

## Test handling
`ShortlistedCVsPage.isJobTitleVisible()` ignores the "Not available" location
placeholder and looks for a real job/designation value, so `TC_SI001` **fails**
on this assertion instead of silently passing. Remove nothing from the scenario —
it is documenting a genuine gap.

## The All Applicants card has the same gap
`/dashboard/all-applicants` renders the same shape. Its card (`.inner-box`)
contains only these text-bearing nodes:
```
a  = "Tosin Adeleye"          ← candidate name
a  = "Java" / "C#" / "PHP" / "JavaScript"   ← skill tags
span = "CV"                    ← CV link
span.text-warning = "Pending"  ← application status
```
No job title, even though `GET /api/account/applicants/?page=1&sort=desc` returns
`jobPostId` on every record. `TC_AA001` asserts the job title per the test plan and
therefore fails.

Both assertions previously **soft-passed** because the accounts had no applicants
at all and the page objects fell back to checking a table header / nav element.
With real data seeded, the soft-pass no longer fires and the gap is visible.

## Suggested owner
Frontend (shortlisted candidate card and applicant card) — the data is already in
the API responses.
