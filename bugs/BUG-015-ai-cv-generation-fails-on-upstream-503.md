# BUG-015 — AI CV generation fails intermittently: upstream Gemini 503 is surfaced as a dead-end error

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Type** | Missing retry / error handling on a third-party API |
| **Area** | Candidate → Dashboard → Create own CV → *Generate via AI* / *Write via AI* |
| **Affected tests** | `TC070`, `TC071`, `TC072` — AI-assisted CV generation |
| **Environment** | https://jobrator.com/dashboard/create-own-cv, API `api.jobrator.com` |
| **Date found** | 2026-07-27 |
| **Status** | Open — intermittent, reproduces reliably under repetition |

## Summary
`POST /api/account/ai/generate` proxies to **Google Gemini 2.5 Flash**. When the
model replies **503 Service Unavailable** ("high demand"), Jobrator does not
retry or degrade gracefully — it returns HTTP 500 and the UI shows a modal
reading only **"Error writing via AI"** with an OK button. The user's typed
input is discarded and there is no retry affordance.

## Steps to reproduce
1. Log in as a **subscribed** candidate and go to **Dashboard → Create own CV**.
2. Fill the required fields, then click **Generate via AI** in the Experience
   section.
3. Enter any brief points, e.g.
   `Built REST APIs, led team of 5 devs, improved performance by 40%`, and click
   **Generate**.
4. Repeat several times — roughly **1 attempt in 3** fails.

## Expected
Transient upstream unavailability is absorbed: retry with backoff, and if it
still fails, show an actionable message ("The AI service is busy, try again")
while **preserving the user's input**.

## Actual
```
POST https://api.jobrator.com/api/account/ai/generate
  → 500 {"message":"Failed to generate text",
         "error":"[GoogleGenerativeAI Error]: Error fetching from
          https://generativelanguage.googleapis.com/v1beta/models/
          gemini-2.5-flash:generateContent: [503 Service Unavailable]
          This model is currently experiencing high demand. Spikes in demand
          are usually temporary. Please try again later."}
```

UI modal: **"Error / Error writing via AI / OK"**.

Measured over one probe of three consecutive attempts on an otherwise idle
account: attempt 1 → 500 (503 upstream), attempts 2 and 3 → 200 with valid
generated content. A sequential re-run of the three scenarios gave 2 failed /
1 passed. The endpoint itself is correctly wired — the failure is purely the
unhandled upstream 503.

## Impact
- A paid, subscription-gated feature fails for roughly a third of attempts.
- The error is a dead end: no retry button, and the entered points are lost, so
  the user must retype them.
- Upstream's own guidance ("Spikes in demand are usually temporary. Please try
  again later.") is exactly the case a retry is designed for.

## Secondary finding — provider error leaked to the client
The 500 body forwards Gemini's raw error verbatim, disclosing the model
(`gemini-2.5-flash`), the provider, and the upstream endpoint URL. Internal
provider errors should be logged server-side and replaced with a generic
client-facing message.

## Test handling
`TC070`/`TC071`/`TC072` assert that no error modal appears after **Generate**
(`src/steps/dashboard/generate-cv-with-ai.steps.ts:200`). That assertion is
correct and should stay. Because the defect is intermittent these scenarios are
**flaky-red** until a retry is implemented — they are not a stable signal, and
should not be soft-passed to hide it.

## Suggested owner
Backend — add bounded retry with exponential backoff around the Gemini call,
map exhausted retries to a friendly message, and stop forwarding the provider
error body. Frontend — keep the modal's input on failure and offer **Try again**.
