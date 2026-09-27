# BUG-016 — No brute-force protection on login: unlimited failed attempts, no lockout, no CAPTCHA, no rate limiting

| Field | Value |
|-------|-------|
| **Severity** | High (security — OWASP A07: Identification & Authentication Failures) |
| **Type** | Missing security control (backend) |
| **Area** | Auth → Login (`POST https://api.jobrator.com/api/login`) |
| **Affected tests** | `TC019` — *OWASP A07 — Brute force protection after multiple failures* |
| **Environment** | https://jobrator.com/login → `api.jobrator.com` |
| **Date found** | 2026-07-27 |
| **Retested** | 2026-08-17 — still reproducible |
| **Status** | Open — **NOT fixed** |

## Summary
The login endpoint applies no brute-force protection. An attacker can submit
unlimited failed password attempts against a known account with no account
lockout, no CAPTCHA challenge, no rate limiting (`429`/`423`), and no
`RateLimit-*`/`Retry-After` throttling headers. A correct password submitted
immediately after a burst of failures logs in normally, proving no lockout was
ever imposed.

## Steps to reproduce
1. Navigate to https://jobrator.com/login and select the **Candidate** tab.
2. Enter a valid registered email and an **incorrect** password; tick the
   required readiness checkbox; submit.
3. Repeat the incorrect-password submission 5 (and then 6+) times in a row.
4. Observe the response after the 5th failure.
5. Submit the **correct** password and observe the result.

## Expected
After ~5 consecutive failed attempts the application enforces brute-force
protection — account lockout **or** a CAPTCHA challenge — and records a
security event confirming the protection fired.

## Actual
Every failed attempt returns the same response with no escalation:

```
POST https://api.jobrator.com/api/login
  → 401 Unauthorized
    {"message":"Invalid credentials or profile",
     "exception":"E_INVALID_AUTH_PASSWORD: Password mis-match"}
```

Retest of 2026-08-17 (browser, real form with the readiness checkbox ticked):

| Signal | Result |
|--------|--------|
| Failed attempts submitted | 6 (attempts 2–6 reached the API; attempt 1 pre-checkbox did not) |
| HTTP `429`/`423` throttle | **none** — all `401` |
| `RateLimit-*` / `Retry-After` headers | **none** |
| CAPTCHA after 5+ failures | **not present** |
| Lockout / "too many attempts" wording | **none** |
| Correct password after the burst | **logged in immediately** (`200 OK`, bearer token, redirect to `/jobs`) |

Direct API replay confirms the same: **12** consecutive failed `POST /api/login`
calls with the full payload all returned `401 Unauthorized`, with no
rate-limit headers and no change in behaviour.

## Note on the error-log verification step
The reproduction asks to *"verify that no error-log entry is created for the
lockout/CAPTCHA event (confirming the protection was never invoked)."* Server
logs are not accessible from the black-box test harness, so this cannot be
asserted directly. However, the observable behaviour above (no lockout, no
CAPTCHA, no throttling across 12 attempts) already establishes that the
protection mechanism was never triggered — there is no protection to log.

## Impact
- Credential-stuffing and password-spraying against any known Jobrator account
  are unthrottled and can run at full speed.
- No defence-in-depth against automated password guessing on the candidate,
  employer, or admin login (all share `POST /api/login`).
- The API additionally returns a **verbose exception string**
  (`E_INVALID_AUTH_PASSWORD: Password mis-match`) that distinguishes a
  wrong password from other failure modes — an oracle that aids an attacker
  (relates to the intent behind `TC020`).

## Test handling
`TC019`'s step *"the account should be locked out or a CAPTCHA challenge should
appear"* currently **soft-passes** — it logs the gap as a warning and asserts
`toBeTruthy()` on `... || true`, so it never fails the suite
(`src/steps/auth/login.steps.ts`, `attemptLoginMultipleTimes` in
`src/pages/LoginPage.ts`). Per `bugs/README.md` conventions a soft-pass that
hides a real defect should become a hard assertion that fails **red** against
this bug and is restored to green only when protection ships.

Two accuracy issues in the existing tooling, both fixed in the retest:
- The retest helper submits without ticking the hidden `checkbox-ready` input,
  so the **first** attempt never reaches the server (the form is blocked
  client-side). Use `LoginPage.login()`, which sets the checkbox.
- The old check only inspected UI text/CAPTCHA; it missed HTTP `429`/`423` and
  `RateLimit`/`Retry-After` headers. The retest inspects the auth response
  directly.

Reproduction script: `src/scripts/tc019_manual_retest_v2.ts`
(`npx ts-node src/scripts/tc019_manual_retest_v2.ts`).

## Suggested owner
Backend — add server-side rate limiting + account lockout (or step-up CAPTCHA)
on `POST /api/login`, keyed on account **and** source IP, emitting a security
event when the threshold is crossed. Return a generic error and drop the
verbose `E_INVALID_AUTH_PASSWORD` detail from the client-facing response.

## Related
`TC020` (verbose errors must not enumerate valid emails) — same endpoint's
response verbosity.
