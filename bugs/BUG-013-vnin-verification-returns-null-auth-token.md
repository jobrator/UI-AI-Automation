# BUG-013 — VNIN verification is broken for all users: provider returns a null auth token

| Field | Value |
|-------|-------|
| **Severity** | Critical (P1) |
| **Type** | Third-party integration failure (backend/frontend) |
| **Area** | Candidate → Dashboard → VNIN Verification |
| **Affected tests** | `TC_VN002` — *Verification succeeds with valid VNIN*; `TC_VN005` — *Verified badge on dashboard*; masks `TC_VN003` |
| **Environment** | https://jobrator.com/dashboard/vnn-verify, provider `payarenaverification.com` |
| **Date found** | 2026-07-27 |
| **Status** | Open — feature non-functional in production |

## Summary
Identity verification never reaches the VNIN provider. Submitting the form makes
**exactly one** network request — a token exchange — which returns
`auth_token: null`. The flow stops there, so the VNIN number is **never
transmitted** and no lookup is ever performed. Every user sees
*"Failed — VNIN Verification failed"* regardless of what they enter.

## Steps to reproduce
1. Log in as a candidate and go to **Dashboard → VNIN Verification**
   (`/dashboard/vnn-verify`).
2. Fill every field — First/Middle/Surname, Gender, Date of Birth,
   Registered Number (`input[name="trustedNumber"]`), VNIN
   (`input[name="vnin_number"]`).
3. Click **Verify** with devtools → Network open.

## Expected
The VNIN is submitted to the provider for lookup, and the result (verified or
rejected) is reported back to the user.

## Actual
One request only:

```
POST https://payarenaverification.com/api/account/token
  → 200 {"success":true,"description":"Successful",
         "data":{"auth_token":null,
                 "access_tokenexpire":"2026-08-03T17:16:18.5173136Z"}}
```

No follow-up request carrying the VNIN is ever issued. The UI then renders a
SweetAlert: **"Error / VNIN Verification failed"**.

Note the response is self-contradictory — `success: true` and
`description: "Successful"` alongside a **null** token. The frontend appears to
treat the token call as authoritative and abandons the flow when the token is
unusable, without surfacing the real cause.

## Impact
- Identity verification is **unavailable to every user in production**. No
  candidate can obtain a Verified badge.
- A genuine, NIMC-registered VNIN fails identically to a fabricated one — the
  value is never sent, so correctness of the input is irrelevant.
- Employers relying on the Verified signal see an unverifiable candidate pool.

## Test handling
`TC_VN002` and `TC_VN005` previously returned `'skipped'` from their step
definitions, justified as *"requires a real VNIN registered with the NIN
service — environmental"*. **That justification is incorrect** and was masking
this defect: the network capture above shows the VNIN is never sent, so no test
data could ever make the scenario pass. Per `bugs/README.md` conventions these
should become hard assertions that fail red against this bug.

`TC_VN003` (*invalid VNIN shows an error*) currently **passes for the wrong
reason** — the error it observes originates from this broken integration, not
from VNIN validation, so it would also pass with a valid VNIN.

## Related
See **BUG-014** — the same token request exposes the provider's admin
credentials client-side, which is a plausible cause of the null token if those
credentials were rotated after leaking.

## Suggested owner
Backend (move the token exchange server-side and handle a null token) with
the provider integration owner (confirm credential validity and the expected
token contract).
