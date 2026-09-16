# BUG-010 — Employment Type does not offer "Internship"

| Field | Value |
|-------|-------|
| **Severity** | Low (spec gap) |
| **Type** | Missing reference option vs. test plan |
| **Area** | Employer → Post A New Job / Edit Job |
| **Affected test** | `TC_PJ005` — *Employment Type dropdown contains the expected options* (Internship example) |
| **Environment** | https://jobrator.com/dashboard/post-jobs |
| **Date found** | 2026-07-26 |
| **Status** | Open — Examples table trimmed to the shipped options |

## Summary
The test plan lists four employment types — Full-time, Part-time, Contract and
**Internship**. The live form offers only three.

## Evidence
Employment Type is a checkbox group (`input[name="employmentTypes"]`), not a
dropdown:
```json
[{"value":"1","label":"Full-time"},
 {"value":"2","label":"Part-time"},
 {"value":"3","label":"Contractual"}]
```
Work Mode is complete by comparison:
```json
[{"value":"1","label":"Remote"},{"value":"2","label":"On-site"},{"value":"3","label":"Hybrid"}]
```
("Contract" in the test plan matches the shipped "Contractual" — only Internship
is genuinely missing.)

## Expected
An "Internship" option, or the test plan updated to drop it.

## Test handling
The `Internship` row was removed from the `TC_PJ005` Examples table in
`features/employer/post_job.feature` (with a comment pointing here) so the
scenario keeps exercising the three real options strictly, instead of one example
silently skipping on every run. Re-add the row once the option ships.

## Suggested owner
Product/Backend — the employment types look like seeded reference data.
