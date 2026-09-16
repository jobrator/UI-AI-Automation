# BUG-005 — Interview scheduling modal has no interview format/type field

| Field | Value |
|-------|-------|
| **Severity** | Low (spec gap) |
| **Type** | Missing field vs. test plan |
| **Area** | Employer → Shortlisted CVs → Schedule Interview |
| **Affected test** | `TC_SI002` — *Employer can initiate interview scheduling from the Shortlisted CVs page* |
| **Environment** | https://jobrator.com/ |
| **Date found** | 2026-07-26 |
| **Status** | Open — feature file corrected to match the product |

## Summary
The test plan expects the interview scheduling form to offer a **format or type**
field (e.g. Online / In-person / Phone). The live modal has no such control —
every interview is implicitly an online meeting identified by a link.

## Actual form ("Schedule Interview for <name>", `.modal.fade.show`)
| Control | Purpose |
|---|---|
| `input[name="meetingDate"]` (`type="datetime-local"`) | date **and** time in one control |
| `input[name="meetingLink"]` ("Enter the Interview Link Here") | meeting link |
| `input[name="attendees.0.email"]` + **Add New Attendee** | attendee list |
| **Submit** | creates the interview |

`POST /api/account/interviews` accepts exactly `{ jobId, candidateId, meetingLink,
meetingDate, ... }` — there is no format/type in the contract either, so this is a
product-scope gap rather than a UI omission.

## Expected
Either an interview format/type selector (matching the test plan), or the test
plan updated to drop it.

## Test handling
`features/employer/shortlisted_cvs_and_interviews.feature` now asserts the fields
the product actually has — date, time, **attendee email**, and meeting link — with
a comment pointing here. Date and time are both satisfied by the single
`datetime-local` control. No soft-pass: if any of those four disappear the
scenario fails.

## Suggested owner
Product (decide whether interview formats are in scope) → then Frontend/Backend.
