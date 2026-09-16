# BUG-007 — CV manager has no LinkedIn (or any) share control

| Field | Value |
|-------|-------|
| **Severity** | Medium (feature absent) |
| **Type** | Feature not implemented vs. test plan |
| **Area** | Candidate → Dashboard → CV manager |
| **Affected tests** | `TC056` — *Share uploaded CV via LinkedIn from CV manager*; `TC057` — *Only LinkedIn is available as a CV sharing option* |
| **Environment** | https://jobrator.com/dashboard/cv-manager |
| **Date found** | 2026-07-26 |
| **Status** | Open — tests assert real behaviour and fail |

## Summary
The test plan specifies that an uploaded CV can be shared to LinkedIn, and that
LinkedIn is the only sharing option. The live CV manager exposes **no share
section and no social icons at all**.

## Evidence
Each uploaded resume renders exactly three hover-revealed actions:
```html
<div class="cv-box-content">
  <span class="title px-4 docTitle">Seed CV DOCX</span>
  <div class="edit-btns">
    <a target="_blank"><button><span class="la la-eye"></span></button></a>   <!-- View -->
    <button><span class="la la-trash"></span></button>                        <!-- Delete -->
    <button><span class="la la-download"></span></button>                     <!-- Download -->
  </div>
</div>
```
A page-wide sweep for `[class*="linkedin"]`, `[class*="share"]`, `.fa-linkedin`
and any `a[href*="linkedin"]` returns **0 nodes**. There is no share section to
scroll to.

Note the action buttons are hidden until hover, by design:
```css
.file-edit-box .cv-box-content .edit-btns { display: none; transform: translateY(-200px); }
.file-edit-box:hover .cv-box-content .edit-btns { display: flex; transform: translateY(0); }
```

## Expected
A share affordance on each CV entry that opens the LinkedIn share dialog, with no
other social networks offered.

## Test handling
The former "feature-unavailable" skips in `src/steps/dashboard/cv-upload.steps.ts`
are now assertions naming this bug, so `TC056`/`TC057` fail visibly instead of
disappearing from the report. `CvUploadPage.hoverFirstCvItem()` correctly hovers
`div.file-edit-box` to reveal the real actions.

## Suggested owner
Product — confirm whether CV sharing is still in scope; then Frontend.
