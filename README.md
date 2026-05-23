# Jobrator BDD E2E Automation Framework

A production-ready **BDD end-to-end Playwright automation framework** for [Jobrator](https://jobrator.com/) using:

- **Cucumber.js** with **TypeScript** for BDD scenarios
- **Playwright** for cross-browser automation (Chromium + Firefox in parallel)
- **Page Object Model** with a shared `CommonLibrary`
- **AI Agents** powered by Claude for autonomous test design and code generation
- **ISTQB**-aligned scenario design and **OWASP**-aligned security testing

---

## Project Structure

```
jobrator-e2e/
├── .env                              # Environment vars (gitignored)
├── .env.example                      # Template — copy to .env
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── cucumber.js                       # Cucumber profiles (chrome, firefox, smoke, etc.)
│
├── features/                         # Gherkin feature files
│   └── auth/
│       └── login.feature             # 28 scenarios: ISTQB + OWASP
│
├── src/
│   ├── agents/
│   │   ├── TestPlannerAgent.ts       # AI: generates Gherkin scenarios
│   │   └── CodeGeneratorAgent.ts     # AI: generates Playwright code
│   │
│   ├── config/
│   │   └── env.config.ts             # Singleton env loader + validator
│   │
│   ├── hooks/
│   │   └── hooks.ts                  # Before/After/BeforeAll/AfterAll lifecycle
│   │
│   ├── lib/
│   │   └── CommonLibrary.ts          # Reusable Playwright wrappers
│   │
│   ├── pages/
│   │   ├── BasePage.ts               # Abstract base for all page objects
│   │   └── LoginPage.ts              # Locators + actions for the login page
│   │
│   ├── steps/
│   │   └── auth/
│   │       └── login.steps.ts        # Step definitions (Given/When/Then)
│   │
│   ├── support/
│   │   └── world.ts                  # CustomWorld — browser/page state
│   │
│   └── types/
│       └── index.ts                  # Shared TypeScript interfaces
│
├── test-data/
│   └── users.json                    # Credentials + security payloads
│
├── scripts/
│   ├── run-parallel.js               # Spawns Chromium + Firefox in parallel
│   └── generate-report.js            # Builds HTML report
│
└── reports/                          # Generated artefacts (gitignored)
    ├── cucumber-report.json
    ├── html/
    ├── screenshots/
    ├── videos/
    └── traces/
```

---

## Quick Start

### 1. Prerequisites

- **Node.js** ≥ 18
- **npm** (bundled with Node)
- An **Anthropic API key** (only needed for the AI agents — tests run fine without it)

### 2. Install

```bash
git clone <this-repo> jobrator-e2e
cd jobrator-e2e
npm install
npx playwright install --with-deps chromium firefox
```

### 3. Configure

Copy the example env file and fill in your details:

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
JOBRATOR_SITE=https://jobrator.com/
CANDIDATE_EMAIL=candidatejobrator+tosin@gmail.com
CANDIDATE_PASSWORD=Tester@12

# Only required if you want to run the AI agents
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Run the tests

| Goal | Command |
|------|---------|
| Run on Chrome **and** Firefox in parallel (default) | `npm test` |
| Run only on Chrome | `npm run test:chrome` |
| Run only on Firefox | `npm run test:firefox` |
| Run with browser visible | `npm run test:chrome:headed` |
| Run only smoke tests | `npm run test:smoke` |
| Run only security tests | `npm run test:security` |
| Run a single feature | `node scripts/run-parallel.js --feature=features/auth/login.feature` |
| Run by tag | `node scripts/run-parallel.js --tags="@TC001"` |
| Run sequentially (debug) | `npm run test:sequential` |

After the run, an HTML report is generated at `reports/html/index.html`.

---

## How the Pieces Fit Together

```
┌─────────────────┐
│ login.feature   │  Gherkin — "Given/When/Then"
└────────┬────────┘
         │
         ▼  Cucumber matches steps
┌─────────────────┐     ┌──────────────────┐
│ login.steps.ts  │────▶│  LoginPage       │  Locators + Actions
│ (assertions)    │     └──────┬───────────┘
└────────┬────────┘            │
         │                     ▼
         │             ┌──────────────────┐
         └─────────────▶│ CommonLibrary    │  click, fill, waitFor, etc.
                        └──────┬───────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Playwright Page  │
                        └──────────────────┘

         CustomWorld (per scenario)
         hooks.ts launches/closes the browser
```

**Rules enforced:**

1. Page Objects **never** assert — they return values.
2. Step Definitions **always** contain assertions via Playwright's `expect()`.
3. Step Definitions call `LoginPage` methods or `this.lib` (CommonLibrary) — never raw Playwright.
4. CommonLibrary wraps every Playwright primitive so retries and timeouts are consistent.
5. Hooks own the browser lifecycle — never inside steps or page objects.

---

## Parallel Execution Model

`npm test` runs two `cucumber-js` processes simultaneously:

- One with `BROWSER=chromium` using the `chrome` profile
- One with `BROWSER=firefox` using the `firefox` profile

Each profile **also** runs scenarios in parallel (workers = 3 by default), so the full matrix is **2 browsers × 3 workers = 6 concurrent scenarios**.

To force sequential single-browser execution (for debugging):

```bash
npm run test:sequential
```

To skip a scenario on a specific browser, tag it:

```gherkin
@skip-firefox
Scenario: Some chromium-only scenario
  ...
```

---

## The Two AI Agents

Both agents are **Anthropic Claude** powered (using `claude-sonnet-4-20250514`) with the **web search** tool enabled. They have access to the live Jobrator site and the candidate credentials in `.env` so they can understand actual flows.

### 🧠 Test Planner Agent

Generates comprehensive Gherkin scenarios using ISTQB techniques and OWASP security categories.

```bash
# Default: regenerates the login feature
npm run agent:planner

# Plan a different feature
npm run agent:planner -- --feature=registration
npm run agent:planner -- --feature=job-search --output=features/jobs
```

**What it does:**
1. Searches the web for context about the feature on jobrator.com
2. Identifies user flows, validation rules, edge cases
3. Designs scenarios covering:
   - Equivalence Partitioning
   - Boundary Value Analysis
   - Decision Tables
   - State Transitions
   - Error Guessing
4. Adds OWASP A01/A02/A03/A07 security scenarios
5. Writes the .feature file to `features/<area>/`

### 🛠️ Code Generator Agent

Generates the Page Object class and Step Definitions for an existing feature file. Detects existing step patterns to **prevent duplicate-step merge conflicts**.

```bash
# Default: codegen for the login feature
npm run agent:codegen

# Different feature
npm run agent:codegen -- --feature=features/registration/register.feature

# Preview without writing files
npm run agent:codegen -- --feature=features/auth/login.feature --dry-run
```

**What it does:**
1. Researches the live UI on jobrator.com
2. Reads existing step files to avoid duplicate step regexes
3. Generates:
   - `src/pages/<Name>Page.ts` — locators + methods, no assertions
   - `src/steps/<area>/<name>.steps.ts` — Given/When/Then with assertions
4. Follows Playwright best practices (role-based locators first, no `sleep()`, proper async/await)

### Recommended workflow

```bash
# 1. Have the planner design tests for a new feature
npm run agent:planner -- --feature=registration

# 2. Have the code generator turn them into runnable tests
npm run agent:codegen -- --feature=features/registration/registration.feature

# 3. Run them
npm test
```

---

## Reporting

After every run you get:

| Artifact | Location |
|----------|----------|
| HTML report (multi-browser) | `reports/html/index.html` |
| Cucumber JSON (per browser) | `reports/cucumber-report-chrome.json`, `…-firefox.json` |
| Screenshots (failures only) | `reports/screenshots/` |
| Videos (failures only) | `reports/videos/` |
| Traces (failures only) | `reports/traces/` — open with `npx playwright show-trace <file>` |
| Re-run failed tests | `reports/@rerun.txt` |

To re-run only previously failed tests:

```bash
npx cucumber-js --config cucumber.js --profile rerun
```

---

## Adding a New Feature

The fastest path is to use the agents:

```bash
npm run agent:planner -- --feature=my-feature
npm run agent:codegen -- --feature=features/my-feature/my-feature.feature
npm test
```

The manual path:

1. Create `features/<area>/<name>.feature` with your scenarios.
2. Create `src/pages/<Name>Page.ts` extending `BasePage`.
3. Create `src/steps/<area>/<name>.steps.ts` with `Given/When/Then`.
4. Run `npm test`.

---

## Common Tags

| Tag | Meaning |
|-----|---------|
| `@smoke` | Critical path — runs on every build |
| `@regression` | Full regression suite |
| `@security` `@owasp` | OWASP security scenarios |
| `@boundary` | Boundary value analysis |
| `@negative` `@positive` | Negative / happy path |
| `@session` | Session management |
| `@ui` | UI / UX checks |
| `@requires-login` | Hook auto-logs in before this scenario |
| `@skip` | Skipped on every browser |
| `@skip-chrome` `@skip-firefox` | Skipped on a specific browser |

---

## Troubleshooting

**Tests time out immediately**
→ Increase `DEFAULT_TIMEOUT` in `.env`, or run with `HEADLESS=false` to watch what's happening.

**`Browser not installed` error**
→ `npx playwright install --with-deps chromium firefox`

**Agents fail with "ANTHROPIC_API_KEY is not set"**
→ Add a valid Anthropic API key to `.env`. The framework runs fine without agents; they're optional.

**Locators don't match the live site**
→ The `LoginPage` uses defensive multi-locator strings. If a locator drifts, run the **CodeGeneratorAgent** to regenerate it, or update `src/pages/LoginPage.ts` manually.

**Want more parallel workers?**
→ Edit `parallel: 3` in `cucumber.js`.

---

## License

ISC
