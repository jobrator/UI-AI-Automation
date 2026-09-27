# BUG-014 — Verification provider's admin credentials are exposed in client-side code

| Field | Value |
|-------|-------|
| **Severity** | Critical (P1 — security) |
| **Type** | Credential exposure / secret in client bundle |
| **Area** | Candidate → Dashboard → VNIN Verification |
| **Affected tests** | Surfaced while investigating `TC_VN002` (see **BUG-013**) |
| **Environment** | https://jobrator.com/dashboard/vnn-verify, provider `payarenaverification.com` |
| **Date found** | 2026-07-27 |
| **Status** | Open — credentials live in production |

## Summary
The VNIN verification flow performs its provider authentication **from the
browser**, sending a hard-coded username and password in plaintext. Any visitor
who opens devtools — or reads the JavaScript bundle — obtains the verification
provider's **admin** credentials.

## Steps to reproduce
1. Log in as any candidate and open **Dashboard → VNIN Verification**.
2. Open devtools → Network.
3. Click **Verify** and inspect the outgoing request body.

## Expected
Provider authentication happens server-side. No third-party secret is ever
present in client-delivered code or in a browser-originated request.

## Actual
```
POST https://payarenaverification.com/api/account/token
Request body:
{"Username":"admin@jobrator.com","Password":"640SIIv8"}
```

The credentials are sent directly from the page, so they are visible to every
user of the site and to anything observing the client (extensions, proxies,
shared machines). The account name indicates an **administrative** identity with
the verification provider, not a scoped per-request token.

## Impact
- Anyone can authenticate to `payarenaverification.com` as Jobrator's admin
  account and use — or exhaust — the verification quota Jobrator pays for.
- Depending on that account's scope, third parties may be able to read
  verification records, which are **identity documents of Nigerian citizens**.
  This carries NDPR exposure.
- The credentials must be treated as **already compromised**: they have been
  publicly retrievable for as long as this code has been deployed.

## Remediation
1. **Rotate the `admin@jobrator.com` credentials with the provider immediately.**
   Do this before, and independently of, the code fix.
2. Move the token exchange to the Jobrator backend. The browser should call a
   Jobrator endpoint; only the server should hold provider credentials.
3. Issue the frontend a short-lived, scoped token rather than an admin identity.
4. Audit provider-side access logs for use from unexpected origins.
5. Purge the secret from git history if it was ever committed.

## Related
**BUG-013** — VNIN verification is non-functional because this same token call
returns `auth_token: null`. If the credentials were rotated by the provider after
leaking, that would explain the null token, making these two defects one
incident. Fixing BUG-014 correctly may resolve BUG-013.

## Suggested owner
Security / Backend. Treat as an incident, not a routine ticket.
