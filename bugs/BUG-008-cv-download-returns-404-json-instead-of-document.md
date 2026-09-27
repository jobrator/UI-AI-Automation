# BUG-008 — CV download returns a 404 JSON error body instead of the uploaded document

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Type** | Broken URL construction (frontend) / missing route (backend) |
| **Area** | Candidate → Dashboard → CV manager → Download |
| **Affected tests** | `TC058` — *Download uploaded CV in PDF format*; `TC059` — *Download uploaded CV in DOC format* |
| **Environment** | https://jobrator.com/dashboard/cv-manager, API https://api.jobrator.com/ |
| **Date found** | 2026-07-26 |
| **Status** | Open — test asserts real behaviour and fails |

## Summary
The download action on an uploaded CV does not deliver the stored file. It
requests a **non-existent API route** and saves the resulting 404 JSON error body
to disk as `jobrator_<CV title>.json`. The user gets a 115-byte JSON file named
after their CV instead of their PDF/DOCX.

## Steps to reproduce
1. Log in as a candidate and go to **Dashboard → CV manager**.
2. Upload a CV (e.g. `test-data/cv/tc052-valid-cv.docx`, title "Seed CV DOCX").
3. Hover the CV entry to reveal the actions, then click the **download** icon
   (`button:has(span.la-download)`).

## Expected
The stored document downloads with its original name and type, e.g.
`1785099364067_tc052-valid-cv.docx` (`application/vnd.openxmlformats-officedocument…`).

## Actual
```
suggestedFilename: "jobrator_Seed CV DOCX.json"
size:              115 bytes
content:           {"message":"E_ROUTE_NOT_FOUND: Cannot GET:/api/public/upload…"}
```

The document record itself is stored correctly — `GET /api/account/documents/?page=1`
returns:
```json
{"id":1059,"title":"Seed CV DOCX","files":[{"name":"1785099364067_tc052-valid-cv.docx",
  "path":"public/uploads/documents/2026-07/1785099364067_tc052-valid-cv.docx",
  "mimeType":"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}]}
```
so the frontend appears to prefix the stored `path` with `/api/`, producing
`api.jobrator.com/api/public/uploads/…`, which is not a served route. Related 404s
on the same pattern are visible across the dashboard, e.g.
`404 GET https://api.jobrator.com/uploads/candidates/2024-11/…png`.

## Impact
Candidates cannot retrieve their own uploaded CVs. Employers relying on the same
file-serving path are likely affected too (see the "View CV" action on
All Applicants / Shortlisted CVs).

## Test handling
The former "feature-unavailable" skip in
`src/steps/dashboard/cv-upload.steps.ts` is now a real assertion — a `.docx` CV is
seeded by `npm run seed:full`, so the stored file genuinely *is* a DOC and the
only reason the assertion fails is this defect.

## Suggested owner
Frontend (download URL construction) with Backend (confirm the correct
file-serving route and that `/api/public/uploads/**` should exist).
