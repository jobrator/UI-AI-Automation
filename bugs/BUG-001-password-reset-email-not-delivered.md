# BUG-001 — Password reset email delivery is intermittent / exceeds 180 s

| Field | Value |
|-------|-------|
| **Severity** | Medium (intermittent) |
| **Type** | Environmental / Backend (email delivery latency) |
| **Area** | Authentication → Forgot password |
| **Affected test** | `TC_PR001` — *Candidate resets password via email link and logs in with new credentials* (`features/auth/password_reset.feature:11`) |
| **Environment** | https://jobrator.com/ (production) |
| **Date found** | 2026-07-21 |
| **Status** | Open — not a test-code defect |

## Summary
After a candidate submits the *Forgot password* form the UI shows the success
confirmation, but the password-reset email delivery is **intermittent**: on some
runs it does not arrive within the test's 180-second budget (step times out),
while on other runs it arrives and the full reset flow completes. This is a
backend email-delivery reliability/latency problem, not a test defect.

**Observed 2026-07-21:** first smoke run — email never arrived, `TC_PR001` timed
out at 180 s. Immediate re-run — email arrived and `TC_PR001` passed end to end.

## Steps to reproduce
1. Register a fresh candidate with a Mailinator address
   (e.g. `jobratortestb2w2jspsdm@mailinator.com`).
2. Go to https://jobrator.com/login → **Forgot password**.
3. Enter the registered email and submit.
4. Observe the on-page confirmation ("reset link sent") appears.
5. Open the Mailinator inbox for that address and wait.

## Expected
A "Reset your password" email arrives in the inbox within a reasonable window
(seconds), containing a working reset link.

## Actual
Intermittently, no email arrives. The inbox stays empty for the full 100 s
polling window (20 × 5 s reloads) and the step times out at 180 s:

```
✔ Then a confirmation message should be shown on the forgot password page
✔ When the candidate opens the Mailinator inbox in a new tab
✖ And the candidate opens the Jobrator password reset email
    Error: function timed out, ensure the promise resolves within 180000 milliseconds
URL at failure: https://jobrator.com/forget-password
```

## Evidence / notes
- The app **accepts** the request (confirmation banner is shown), so the failure
  is on the mail-send / delivery path, not the form.
- During the same session the candidate account API was also erroring
  (`GET https://api.jobrator.com/api/account/candidate` → 500, see **BUG-003**),
  which points at a broader backend instability that may include the mailer.
- Trace + screenshot attached to the Cucumber run under
  `reports/traces/TC_PR001_*.zip`.

## Impact
Account recovery via "Forgot password" is unreliable — some users will wait
minutes for (or never receive) the reset email. User-facing account-recovery
reliability issue.

## Test handling
`TC_PR001` is left asserting real behaviour (no soft-pass) — it correctly fails
while the email pipeline is down, and will pass again once delivery is restored.
No test-code change is warranted; this is an environment/backend defect.

## Suggested owner
Backend / Platform (transactional email service + SMTP/provider configuration).
