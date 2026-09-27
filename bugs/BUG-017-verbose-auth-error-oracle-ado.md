# BUG-017 — Azure DevOps Bug work item

> Formatted for direct entry into an Azure DevOps **Bug** work item. Each section
> below maps to an ADO field. Repro Steps / System Info / Acceptance Criteria are
> rich-text fields — paste the content as-is.

---

## Core fields

| ADO field | Value |
|-----------|-------|
| **Work Item Type** | Bug |
| **Title** | Login API leaks internal exception code (`E_INVALID_AUTH_PASSWORD`) confirming password mismatch — enables credential/account enumeration |
| **Area Path** | `Jobrator\Web\Authentication` *(adjust to your project's path)* |
| **Iteration Path** | `Jobrator\Current Sprint` *(adjust)* |
| **State** | New |
| **Reason** | New defect reported |
| **Assigned To** | *(Backend / Auth team)* |
| **Priority** | 2 |
| **Severity** | 3 - Medium *(raise to 2 - High if BUG-016 brute-force protection is not shipped — the two compound)* |
| **Value Area** | Architectural |
| **Tags** | `Security`; `OWASP-A07`; `Authentication`; `InformationDisclosure`; `API` |
| **Found in build / env** | Production — https://jobrator.com → `api.jobrator.com`, retested 2026-08-17 |

---

## Description  *(ADO "Description" field)*

The `POST /api/login` endpoint returns a verbose internal exception
(`E_INVALID_AUTH_PASSWORD: Password mis-match`) when a wrong password is
submitted against a **valid** account. This confirms the account exists and that
only the password was wrong, creating a user-enumeration / credential-stuffing
oracle (OWASP A07, CWE-204/209). The error should be generic and identical across
all invalid-login cases (wrong password, unknown email, wrong profile).

## Repro Steps  *(ADO "Repro Steps" field — Gherkin)*

**Preconditions:** one valid registered candidate email is known to the tester.
Endpoint: `POST https://api.jobrator.com/api/login`.

```gherkin
Feature: Login error responses must not leak the authentication failure reason

  Background:
    Given the Jobrator login API "POST https://api.jobrator.com/api/login" is reachable
    And a valid registered candidate email exists

  @security @owasp-a07 @bug-017
  Scenario: Wrong password on a real account leaks an internal exception code
    Given the request body contains a registered email and profile "Candidate"
    When the user submits the login request with an incorrect password
    Then the response status should be 401 Unauthorized
    And the response body should contain a generic message only
    But the response body actually exposes the field "exception"
    And that field reveals "E_INVALID_AUTH_PASSWORD: Password mis-match"
    # ^ Actual (defect). Expected: no "exception" field, no internal error code.

  @security @owasp-a07 @bug-017
  Scenario: Wrong password and unknown account must be indistinguishable
    When the user submits a wrong password for a registered email
    And the user submits any password for an unregistered email
    Then both responses should return the same HTTP status code
    And both responses should return a byte-identical error body
    And neither response should reveal whether the account exists
    # ^ Currently the registered-email case returns the verbose "exception",
    #   so the two responses differ — enabling enumeration.
```

**Sample request** (for the first scenario):
```
POST https://api.jobrator.com/api/login
Content-Type: application/json

{ "email": "<registered-email>", "password": "DefinitelyWrong@123",
  "profile": "Candidate", "loginMethod": "email" }
```

**Expected result**
A **generic** authentication failure that does not disclose *which* factor failed
and reveals no internal error codes — e.g. `401 { "message": "Invalid credentials" }`.
The response for a wrong password on a real account is **indistinguishable** from
the response for an unknown account.

**Actual result**
```
401 Unauthorized
{
  "message": "Invalid credentials or profile",
  "exception": "E_INVALID_AUTH_PASSWORD: Password mis-match"
}
```

The `exception` field acts as an **oracle**: `E_INVALID_AUTH_PASSWORD` /
`Password mis-match` tells an attacker the email is a valid account and that only
the password needs guessing — narrowing a credential-stuffing / password-spray
attack to confirmed-valid accounts.

---

## System Info  *(ADO "System Info" field)*

- **Endpoint:** `POST https://api.jobrator.com/api/login` (shared by candidate,
  employer, and admin logins)
- **Client:** https://jobrator.com/login (Chromium, latest); also reproduced with
  a direct `curl` API call — not browser-specific
- **Environment:** Production
- **Date observed:** 2026-08-17
- **Discovered during:** TC019 brute-force retest — reproduction script
  `src/scripts/tc019_manual_retest_v2.ts`

---

## Impact

- **User / account enumeration:** the verbose `exception` distinguishes
  "wrong password on a real account" from other failures, confirming which
  emails are registered.
- **Attack narrowing:** compounds with **BUG-016** (no brute-force protection /
  rate limiting on the same endpoint). Together they let an attacker enumerate
  valid accounts *and* brute-force their passwords unthrottled.
- **Information disclosure:** leaking internal exception identifiers
  (`E_INVALID_AUTH_PASSWORD`) exposes implementation detail that aids attackers.
- **Standards:** OWASP Top 10 **A07:2021 — Identification & Authentication
  Failures**; CWE-204 (Observable Response Discrepancy), CWE-209 (Generation of
  Error Message Containing Sensitive Information).

---

## Acceptance Criteria  *(ADO "Acceptance Criteria" field)*

- [ ] `POST /api/login` returns a single **generic** error for all invalid-login
      cases (wrong password, unknown email, wrong profile) — same HTTP status and
      same message body.
- [ ] The response body **no longer contains** the `exception` field, the token
      `E_INVALID_AUTH_PASSWORD`, or the phrase `Password mis-match` (or any
      internal exception/error code).
- [ ] A wrong password on a registered account and any password on an
      unregistered account produce **byte-identical** error responses (status +
      body), verified by test.
- [ ] Internal error codes remain available server-side (logs / telemetry) but
      are never returned to the client.
- [ ] Regression tests `TC029`, `TC030`, `TC031` pass green against the fixed
      endpoint.

---

## Test coverage / linked scenarios

New Gherkin scenarios to add to `features/auth/login.feature` (backing steps must
inspect the **auth HTTP response body**, not UI text):

```gherkin
@security @owasp @regression @TC029
Scenario: TC029 — OWASP A07 — Login error must not leak the internal failure reason
  When the user enters the registered candidate email
  And the user enters password "WrongPassword999"
  And the user clicks the login button
  Then the login API response should not expose an internal exception code
  And the response should not reveal that the password specifically mismatched
  And the user-facing error message should be generic

@security @owasp @regression @TC031
Scenario Outline: TC031 — OWASP A07 — Auth responses must not contain internal error tokens
  When the user enters the registered candidate email
  And the user enters password "WrongPassword999"
  And the user clicks the login button
  Then the login API response body should not contain "<forbidden_token>"

  Examples:
    | forbidden_token         |
    | E_INVALID_AUTH_PASSWORD |
    | Password mis-match      |
    | exception               |
```

---

## Links / relations  *(ADO "Links" tab)*

| Link type | Work item | Note |
|-----------|-----------|------|
| **Related** | BUG-016 — No brute-force protection on login | Same endpoint; compounds this oracle |
| **Related** | TC020 — Verbose errors must not enumerate valid emails | UI-layer sibling of this API-layer leak |
| **Tested By** | TC029, TC031 *(new)* | Response-body assertions |

## Attachments  *(ADO "Attachments")*
- `reports/tc019_retest_v2_final.png` *(login-response evidence from the retest run)*
