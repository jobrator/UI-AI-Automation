#!/usr/bin/env node
/**
 * generate-qa-pdf.js — Builds a QA-meeting PDF summarising every FAILED and
 * SKIPPED scenario from a Cucumber JSON run.
 *
 * Reads:   reports/cucumber-report-fullrun.json if present, else
 *          reports/cucumber-report.json  (override with --json <path>)
 * Writes:  reports/qa-review.html  +  reports/qa-review.pdf
 *
 * Usage:  node scripts/generate-qa-pdf.js [--json <path>] [--out <pdf path>]
 *
 * NOTE: every cucumber run rewrites reports/cucumber-report.json, so running a
 * single scenario to debug it will clobber a full-suite report. After a full run,
 * snapshot it:
 *     cp reports/cucumber-report.json reports/cucumber-report-fullrun.json
 * This script prefers that snapshot precisely so a later debug run cannot
 * silently turn the meeting pack into a 1-scenario report.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
// Prefer the full-run snapshot over the live report, which any single-scenario
// debug run will have overwritten.
const defaultJson = ['reports/cucumber-report-fullrun.json', 'reports/cucumber-report.json'].find(
  (p) => fs.existsSync(path.resolve(p))
);
const JSON_PATH = path.resolve(argOf('--json', defaultJson || 'reports/cucumber-report.json'));
// Optional provenance / caveat banner rendered under the executive summary.
const NOTE = argOf('--note', '');
const SOURCE_LABEL = argOf('--source', path.basename(JSON_PATH));
const PDF_PATH = path.resolve(argOf('--out', 'reports/qa-review.pdf'));
const HTML_PATH = PDF_PATH.replace(/\.pdf$/, '.html');

if (!fs.existsSync(JSON_PATH)) {
  console.error(`[qa-pdf] No Cucumber JSON at ${JSON_PATH}. Run the suite first.`);
  process.exit(1);
}

// ── known skip reasons ───────────────────────────────────────────────────────
// The suite skips deliberately, via `return 'skipped'` in a step definition.
// Each entry maps the step that raises the skip to why it does so, and to the
// bug that actually blocks it (when the "environmental" claim has been
// disproved by investigation).
const SKIP_REASONS = [
  {
    match: /the verification should succeed/i,
    reason:
      'Step returns "skipped" when no success banner appears. The stated reason is ' +
      '"needs a real NIMC-registered VNIN". Network capture disproves this: submitting the ' +
      'form fires exactly one request — POST payarenaverification.com/api/account/token — ' +
      'which returns auth_token: null, so the VNIN is never sent to the provider at all. ' +
      'The failure is identical for any VNIN, valid or not.',
    blocker: 'BUG-013 (VNIN integration returns null auth token)',
    verdict: 'MISCLASSIFIED — real product defect, not environmental'
  },
  {
    match: /the candidate has successfully completed VNIN verification/i,
    reason:
      'Precondition step returns "skipped" when no Verified badge is present. The account ' +
      'can never become verified because the verification flow itself is broken, so this ' +
      'precondition is permanently unsatisfiable.',
    blocker: 'BUG-013 (blocked downstream of TC_VN002)',
    verdict: 'MISCLASSIFIED — blocked by product defect'
  }
];

// ── triage outcomes for failures with no bug filed ───────────────────────────
// Each was investigated against the live site; these are the conclusions.
const TRIAGE_NOTES = {
  TC_CP004:
    'NOT A DEFECT — test-data dependency. The shared candidate already has Java, C#, PHP and ' +
    'JavaScript selected; react-select hides already-selected options, so searching "JavaScript" ' +
    'correctly returns "No options". Fix: have the test pick a skill not already on the profile.',
  TC_EMSG003:
    'NOT A DEFECT — unsatisfiable precondition. "the employer account has no message threads" only ' +
    'warns when threads exist and proceeds anyway; the seeded employer has threads, so the empty ' +
    'state legitimately cannot render. Fix: use a thread-free account or drop the scenario.',
  TC_EREG012: 'FLAKY — passed on sequential re-run; no product defect identified.',
  TC_ACC006: 'FLAKY — passed on sequential re-run; no product defect identified.',
  TC_AJP002: 'FLAKY — passed on sequential re-run; no product defect identified.',
  TC_REG005: 'FLAKY — passed on sequential re-run; no product defect identified.'
};

function skipInfoFor(stepName) {
  const hit = SKIP_REASONS.find((r) => r.match.test(stepName || ''));
  return (
    hit || {
      reason: 'No explicit skip reason recorded in the step definition.',
      blocker: '—',
      verdict: 'UNCLASSIFIED — needs triage'
    }
  );
}

// ── known defect log (bugs/) ─────────────────────────────────────────────────
// Bug write-ups cite the test IDs they block, so the failure → defect mapping is
// derived from the files rather than hand-maintained here.
// Anchored to the repo root (this script lives in <root>/scripts), so the lookup
// does not depend on the shell's working directory.
const REPO_ROOT = path.resolve(__dirname, '..');
const bugsDir = path.join(REPO_ROOT, 'bugs');
const bugFiles = fs.existsSync(bugsDir)
  ? fs.readdirSync(bugsDir).filter((f) => /^BUG-\d+.*\.md$/.test(f)).sort()
  : [];

const bugs = bugFiles.map((f) => {
  const body = fs.readFileSync(path.join(bugsDir, f), 'utf8');
  const rawTitle = (body.match(/^#\s*(.+)$/m) || [, f.replace(/\.md$/, '')])[1];
  // The heading usually repeats the ID ("BUG-004 — ..."); the table has its own ID column.
  const title = rawTitle.replace(/^BUG-\d+\s*[—–-]\s*/, '').trim();
  const id = (f.match(/^(BUG-\d+)/) || [, f])[1];
  const tcs = new Set(
    (body.match(/TC[_ ]?[A-Za-z0-9_]+/g) || []).map((t) => t.replace(/[_ ]$/, ''))
  );
  return { id, file: f, title, tcs };
});

function knownBugsFor(tc) {
  if (!tc || tc === '—') return [];
  return bugs.filter((b) => b.tcs.has(tc)).map((b) => b.id);
}

// ── parse ────────────────────────────────────────────────────────────────────
const features = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const TC_RE = /^@(TC[_A-Za-z0-9]*[0-9][A-Za-z0-9_]*)$/;
// Some scenarios carry their ID only in the name ("TC070 — Subscribed candidate …").
const TC_IN_NAME_RE = /^(TC[_A-Za-z0-9]*?[0-9]+)\b/;

function scenarioStatus(steps) {
  const s = steps.map((x) => (x.result && x.result.status) || 'unknown');
  if (s.includes('failed')) return 'failed';
  if (s.includes('undefined') || s.includes('ambiguous')) return 'undefined';
  if (s.includes('pending')) return 'pending';
  if (s.includes('skipped')) return 'skipped';
  return 'passed';
}

const scenarios = [];
for (const feature of features) {
  for (const el of feature.elements || []) {
    if (el.type && el.type !== 'scenario') continue;
    const steps = el.steps || [];
    const tags = (el.tags || []).map((t) => t.name);
    const tcTag =
      tags.map((t) => (TC_RE.exec(t) || [])[1]).find(Boolean) ||
      (TC_IN_NAME_RE.exec(el.name || '') || [])[1];

    const named = steps.filter((s) => s.keyword && s.keyword.trim() !== 'Hook');
    const failedStep = steps.find((s) => s.result && s.result.status === 'failed');
    const firstSkipped = named.find((s) => s.result && s.result.status === 'skipped');

    const durationNs = steps.reduce(
      (acc, s) => acc + ((s.result && s.result.duration) || 0),
      0
    );

    scenarios.push({
      tc: tcTag || '—',
      feature: feature.name,
      area: (feature.uri || '').split('/')[1] || '—',
      name: el.name,
      uri: feature.uri,
      line: el.line,
      tags: tags.filter((t) => !TC_RE.test(t)),
      status: scenarioStatus(steps),
      failedStep: failedStep
        ? `${(failedStep.keyword || '').trim()} ${failedStep.name || '(hook)'}`.trim()
        : null,
      error: failedStep && failedStep.result ? failedStep.result.error_message || '' : '',
      skippedAt: firstSkipped
        ? `${(firstSkipped.keyword || '').trim()} ${firstSkipped.name}`.trim()
        : null,
      skippedAtName: firstSkipped ? firstSkipped.name : '',
      durationMs: Math.round(durationNs / 1e6)
    });
  }
}

const totals = scenarios.reduce((acc, s) => {
  acc[s.status] = (acc[s.status] || 0) + 1;
  return acc;
}, {});
const total = scenarios.length;
const passed = totals.passed || 0;
const failed = totals.failed || 0;
const skipped = totals.skipped || 0;
const other = total - passed - failed - skipped;
const passRate = total ? ((passed / total) * 100).toFixed(1) : '0.0';
// Executable = scenarios that actually reached a verdict.
const executed = passed + failed;
const execPassRate = executed ? ((passed / executed) * 100).toFixed(1) : '0.0';

const failedList = scenarios.filter((s) => s.status === 'failed');
const skippedList = scenarios.filter((s) => s.status === 'skipped');
const otherList = scenarios.filter(
  (s) => !['passed', 'failed', 'skipped'].includes(s.status)
);

// group failures by feature area for the themes section
const byArea = {};
for (const s of [...failedList, ...skippedList]) {
  const k = `${s.area} / ${s.feature}`;
  byArea[k] = byArea[k] || { failed: 0, skipped: 0 };
  byArea[k][s.status] += 1;
}
const areaRows = Object.entries(byArea).sort(
  (a, b) => b[1].failed + b[1].skipped - (a[1].failed + a[1].skipped)
);

// split failures into "already has a filed defect" vs "needs triage"
for (const s of failedList) s.knownBugs = knownBugsFor(s.tc);
const knownFailures = failedList.filter((s) => s.knownBugs.length);
const newFailures = failedList.filter((s) => !s.knownBugs.length);

// ── html ─────────────────────────────────────────────────────────────────────
const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const trimErr = (e, n = 700) => {
  const oneLine = String(e || '')
    .split('\n')
    .filter((l) => !/^\s*at\s/.test(l)) // drop stack frames
    .join('\n')
    .trim();
  return oneLine.length > n ? `${oneLine.slice(0, n)}…` : oneLine;
};

const failTable = (rows) => `<table>
  <thead><tr>
    <th style="width:74px">Test ID</th>
    <th>Scenario &amp; failure</th>
    <th style="width:62px">Defect</th>
    <th class="num" style="width:44px">Time</th>
  </tr></thead>
  <tbody>
    ${rows
      .map(
        (s) => `<tr>
      <td class="tc">${esc(s.tc)}</td>
      <td>
        <div class="scn">${esc(s.name)}</div>
        <div class="where">${esc(s.feature)} &middot; ${esc(s.uri)}:${s.line}</div>
        ${s.failedStep ? `<div class="where">Failed at: <span class="mono">${esc(s.failedStep)}</span></div>` : ''}
        ${s.error ? `<div class="err mono">${esc(trimErr(s.error))}</div>` : ''}
        ${TRIAGE_NOTES[s.tc] ? `<div class="why">${esc(TRIAGE_NOTES[s.tc])}</div>` : ''}
      </td>
      <td class="mono">${
        s.knownBugs && s.knownBugs.length
          ? esc(s.knownBugs.join(', '))
          : TRIAGE_NOTES[s.tc]
            ? '<span class="where">triaged<br>not a bug</span>'
            : '<span class="verdict">TRIAGE</span>'
      }</td>
      <td class="num">${(s.durationMs / 1000).toFixed(1)}s</td>
    </tr>`
      )
      .join('')}
  </tbody></table>`;

const runDate = new Date().toLocaleString('en-GB', {
  dateStyle: 'full',
  timeStyle: 'short'
});

const html = `
<title>Jobrator E2E — QA Review</title>
<style>
  :root {
    --surface:      #fcfcfb;
    --plane:        #f9f9f7;
    --ink:          #0b0b0b;
    --ink-2:        #52514e;
    --muted:        #898781;
    --hair:         #e1e0d9;
    --rule:         #c3c2b7;
    --good:         #0ca30c;
    --warning:      #fab219;
    --critical:     #d03b3b;
    --serious:      #ec835a;
  }
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    color: var(--ink);
    background: var(--surface);
    font-size: 10.5px;
    line-height: 1.5;
    margin: 0;
  }
  h1 { font-size: 25px; margin: 0 0 4px; letter-spacing: -0.02em; }
  h2 {
    font-size: 14px; margin: 0 0 10px;
    padding-bottom: 5px; border-bottom: 1.5px solid var(--ink);
    letter-spacing: -0.01em;
  }
  h3 { font-size: 11px; margin: 14px 0 6px; }
  /* never strand a heading at the foot of a page */
  h2, h3 { break-after: avoid; }
  thead { break-after: avoid; }
  p  { margin: 0 0 8px; }
  section { margin-bottom: 22px; }
  .sub { color: var(--ink-2); font-size: 11px; }
  .meta { color: var(--muted); font-size: 9.5px; }

  header.cover {
    border-bottom: 2.5px solid var(--ink);
    padding-bottom: 12px; margin-bottom: 20px;
  }
  .kicker {
    text-transform: uppercase; letter-spacing: 0.09em;
    font-size: 9px; font-weight: 700; color: var(--muted); margin-bottom: 6px;
  }
  .runmeta {
    display: flex; flex-wrap: wrap; gap: 6px 26px;
    margin-top: 10px; font-size: 9.5px; color: var(--ink-2);
  }
  .runmeta b { color: var(--ink); font-weight: 600; }

  /* KPI row */
  .kpis { display: flex; gap: 8px; margin-bottom: 14px; }
  .kpi {
    flex: 1; border: 1px solid var(--hair); border-radius: 7px;
    padding: 9px 11px; background: var(--plane);
  }
  .kpi .label {
    font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--muted); font-weight: 600; margin-bottom: 3px;
  }
  .kpi .value { font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
  .kpi .foot { font-size: 8.5px; color: var(--ink-2); margin-top: 1px; }
  .kpi--good    .value { color: var(--good); }
  .kpi--crit    .value { color: var(--critical); }
  .kpi--warn    .value { color: #a5730a; }

  /* stacked share bar */
  .bar {
    display: flex; height: 20px; border-radius: 4px; overflow: hidden;
    background: var(--plane); gap: 2px; margin-bottom: 6px;
  }
  .bar span { display: block; }
  .legend { display: flex; gap: 16px; font-size: 9px; color: var(--ink-2); }
  .legend i {
    display: inline-block; width: 9px; height: 9px; border-radius: 2px;
    margin-right: 5px; vertical-align: -1px;
  }

  table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  thead th {
    text-align: left; font-size: 8.5px; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--muted); font-weight: 700;
    border-bottom: 1px solid var(--rule); padding: 5px 7px 4px;
  }
  td { padding: 6px 7px; border-bottom: 1px solid var(--hair); vertical-align: top; }
  tbody tr { break-inside: avoid; }
  td.tc { font-weight: 650; white-space: nowrap; font-variant-numeric: tabular-nums; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .scn { font-weight: 550; }
  .where { color: var(--muted); font-size: 8.5px; }

  .pill {
    display: inline-block; padding: 1px 6px; border-radius: 20px;
    font-size: 8px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; white-space: nowrap;
  }
  .pill--good     { background: #e7f6e7; color: #05630c; }
  .pill--critical { background: #fbe9e9; color: #8f2020; }
  .pill--warning  { background: #fdf1d6; color: #7a5406; }

  code, .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 8.5px;
  }
  .err {
    background: #fbf6f6; border-left: 2.5px solid var(--critical);
    padding: 5px 7px; margin-top: 4px; border-radius: 0 4px 4px 0;
    white-space: pre-wrap; word-break: break-word; color: #6d1f1f;
  }
  .why {
    background: #fdfaf1; border-left: 2.5px solid var(--warning);
    padding: 5px 7px; margin-top: 4px; border-radius: 0 4px 4px 0;
    color: #6b4d08;
  }
  .verdict {
    font-weight: 700; font-size: 8.5px; text-transform: uppercase;
    letter-spacing: 0.05em; color: #8f2020;
  }
  .callout {
    border: 1px solid var(--hair); border-left: 3px solid var(--critical);
    background: var(--plane); border-radius: 0 7px 7px 0;
    padding: 10px 13px; margin-bottom: 12px;
  }
  .callout h3 { margin-top: 0; }
  ul { margin: 0 0 8px; padding-left: 16px; }
  li { margin-bottom: 3px; }
  .empty {
    padding: 12px; border: 1px dashed var(--rule); border-radius: 7px;
    color: var(--ink-2); text-align: center; font-size: 10px;
  }
  .page-break { break-before: page; }
</style>

<header class="cover">
  <div class="kicker">QA Review Pack &middot; Regression Run</div>
  <h1>Jobrator E2E — Failed &amp; Skipped Scenarios</h1>
  <div class="sub">Playwright + Cucumber BDD &middot; full regression suite</div>
  <div class="runmeta">
    <div>Run date <b>${esc(runDate)}</b></div>
    <div>Environment <b>https://jobrator.com</b></div>
    <div>Browser <b>Chromium</b></div>
    <div>Scenarios <b>${total}</b></div>
    <div>Source <b>${esc(SOURCE_LABEL)}</b></div>
  </div>
</header>

${
  NOTE
    ? `<div class="callout" style="border-left-color:var(--warning)">
  <h3 style="margin-bottom:4px">Data provenance</h3>
  <p style="margin:0">${esc(NOTE)}</p>
</div>`
    : ''
}

<section>
  <h2>1. Executive summary</h2>
  <div class="kpis">
    <div class="kpi kpi--good">
      <div class="label">Passed</div><div class="value">${passed}</div>
      <div class="foot">${passRate}% of suite</div>
    </div>
    <div class="kpi kpi--crit">
      <div class="label">Failed</div><div class="value">${failed}</div>
      <div class="foot">needs triage</div>
    </div>
    <div class="kpi kpi--warn">
      <div class="label">Skipped</div><div class="value">${skipped}</div>
      <div class="foot">no verdict reached</div>
    </div>
    <div class="kpi">
      <div class="label">Pass rate (executed)</div><div class="value">${execPassRate}%</div>
      <div class="foot">${passed} of ${executed} that ran</div>
    </div>
  </div>

  <div class="bar">
    ${passed ? `<span style="width:${(passed / total) * 100}%;background:var(--good)"></span>` : ''}
    ${failed ? `<span style="width:${(failed / total) * 100}%;background:var(--critical)"></span>` : ''}
    ${skipped ? `<span style="width:${(skipped / total) * 100}%;background:var(--warning)"></span>` : ''}
    ${other ? `<span style="width:${(other / total) * 100}%;background:var(--muted)"></span>` : ''}
  </div>
  <div class="legend">
    <span><i style="background:var(--good)"></i>Passed ${passed}</span>
    <span><i style="background:var(--critical)"></i>Failed ${failed}</span>
    <span><i style="background:var(--warning)"></i>Skipped ${skipped}</span>
    ${other ? `<span><i style="background:var(--muted)"></i>Other ${other}</span>` : ''}
  </div>

  <h3>What the meeting needs to decide</h3>
  <ul>
    <li><b>${failed}</b> scenario${failed === 1 ? '' : 's'} failed, all now triaged.
        <b>${knownFailures.length}</b> trace to a filed defect; <b>${newFailures.length}</b> are test bugs or
        flake rather than product defects — see §3.</li>
    <li><b>Three new defects filed from this run: BUG-013, BUG-014, BUG-015.</b> Two are P1 —
        VNIN verification is non-functional in production, and the verification provider's admin
        credentials are exposed in client-side code.</li>
    <li><b>${skipped}</b> scenario${skipped === 1 ? '' : 's'} were skipped by the framework and reached
        <i>no verdict at all</i>. A skip is not a pass: these represent untested coverage — see §4.</li>
    <li>Skips currently labelled "environmental" in the step definitions have been
        re-investigated; at least one is a genuine production defect being masked. See §5.</li>
  </ul>
</section>

<section>
  <h2>2. Where the problems cluster</h2>
  ${
    areaRows.length
      ? `<table>
    <thead><tr><th>Feature area</th><th class="num">Failed</th><th class="num">Skipped</th><th class="num">Total open</th></tr></thead>
    <tbody>
      ${areaRows
        .map(
          ([k, v]) => `<tr>
        <td>${esc(k)}</td>
        <td class="num">${v.failed || ''}</td>
        <td class="num">${v.skipped || ''}</td>
        <td class="num"><b>${v.failed + v.skipped}</b></td>
      </tr>`
        )
        .join('')}
    </tbody></table>`
      : '<div class="empty">No failed or skipped scenarios in this run.</div>'
  }
</section>

<section class="page-break">
  <h2>3. Failed scenarios (${failed})</h2>
  <p class="sub">All ${failed} have been investigated against the live site.
  <b>${knownFailures.length}</b> map to a filed defect in the <span class="mono">bugs/</span> log and are
  expected to stay red until dev fixes them. The remaining <b>${newFailures.length}</b> were triaged and
  found <b>not</b> to be product defects — two are test bugs, four are flake that passed on a
  sequential re-run.</p>

  ${
    failedList.length
      ? `
    ${
      newFailures.length
        ? `<h3>3.1 &nbsp;Triaged — not product defects (${newFailures.length})</h3>
      ${failTable(newFailures)}`
        : ''
    }
    ${
      knownFailures.length
        ? `<h3>3.2 &nbsp;Re-confirming a known defect (${knownFailures.length})</h3>
      ${failTable(knownFailures)}`
        : ''
    }`
      : '<div class="empty">&#10003; No failing scenarios in this run.</div>'
  }
</section>

<section>
  <h2>4. Skipped scenarios (${skipped})</h2>
  <p class="sub">Every skip below is deliberate — a step definition returned
  <span class="mono">'skipped'</span>, which aborts the scenario and marks all remaining
  steps skipped. None were skipped by tag or by the runner.</p>
  ${
    skippedList.length
      ? `<table>
    <thead><tr><th style="width:74px">Test ID</th><th>Scenario, skip point &amp; reason</th><th style="width:96px">Blocked by</th></tr></thead>
    <tbody>
      ${skippedList
        .map((s) => {
          const info = skipInfoFor(s.skippedAtName);
          return `<tr>
        <td class="tc">${esc(s.tc)}</td>
        <td>
          <div class="scn">${esc(s.name)}</div>
          <div class="where">${esc(s.feature)} &middot; ${esc(s.uri)}:${s.line}</div>
          ${s.skippedAt ? `<div class="where">Skipped at: <span class="mono">${esc(s.skippedAt)}</span></div>` : ''}
          <div class="why">${esc(info.reason)}</div>
          <div class="verdict">${esc(info.verdict)}</div>
        </td>
        <td>${esc(info.blocker)}</td>
      </tr>`;
        })
        .join('')}
    </tbody></table>`
      : '<div class="empty">No skipped scenarios in this run.</div>'
  }
  ${
    otherList.length
      ? `<h3>Other non-passing states (${otherList.length})</h3>
    <table><thead><tr><th style="width:74px">Test ID</th><th>Scenario</th><th style="width:70px">State</th></tr></thead>
    <tbody>${otherList
      .map(
        (s) =>
          `<tr><td class="tc">${esc(s.tc)}</td><td>${esc(s.name)}<div class="where">${esc(s.uri)}:${s.line}</div></td><td>${esc(s.status)}</td></tr>`
      )
      .join('')}</tbody></table>`
      : ''
  }
</section>

<section class="page-break">
  <h2>5. Investigation: the VNIN skips are masking a production defect</h2>
  <div class="callout">
    <h3>TC_VN002 / TC_VN005 — reclassify from "environmental" to P1 defect</h3>
    <p>Both scenarios skip with the justification that they need a <i>real, NIMC-registered
    VNIN</i>, implying an unavoidable test-data gap. Live network capture of the submit
    disproves that.</p>
    <p>Clicking <b>Verify</b> produces exactly one network request:</p>
    <div class="err mono">POST https://payarenaverification.com/api/account/token
&#8594; 200 {"success":true,"description":"Successful",
     "data":{"auth_token":null,"access_tokenexpire":"..."}}

UI result: "Failed — VNIN Verification failed"</div>
    <ul>
      <li>The VNIN number is <b>never transmitted</b> — no lookup request is ever made.</li>
      <li>The flow dies at token acquisition because the provider returns
          <span class="mono">auth_token: null</span> alongside <span class="mono">success: true</span>.</li>
      <li>Therefore a genuine registered VNIN would fail <i>identically</i>. VNIN verification
          is broken for <b>every user in production</b>.</li>
      <li>TC_VN005 is collateral: its precondition can never be met while TC_VN002 cannot pass.</li>
    </ul>
  </div>

  <h3>Two further issues found during the same investigation</h3>
  <ul>
    <li><b>Credential exposure (security).</b> The token request ships the verification
        provider's admin username and password in plaintext from the browser, readable by any
        visitor via devtools. This is independently reportable, and plausibly explains the null
        token if those credentials were rotated after leaking.</li>
    <li><b>TC_VN003 is a false green.</b> It asserts "invalid VNIN &rarr; error message" and passes —
        but the error it observes comes from the broken integration, not from VNIN validation.
        It would pass with a valid VNIN too, so it currently proves nothing.</li>
  </ul>

  <h3>Test-side defects in TC_VN005 itself</h3>
  <ul>
    <li>Its final <span class="mono">Then</span> logs a warning and asserts nothing — the scenario
        could never fail even with the precondition met.</li>
    <li>The precondition checks for the badge on the VNIN page, before the
        <span class="mono">When</span> navigates to the dashboard where the badge would appear.</li>
    <li>The selector <span class="mono">*:has-text("Verified")</span> matches ancestors up to
        <span class="mono">&lt;html&gt;</span>, so it can false-positive on any page containing that word.</li>
  </ul>

  <h3>TC070 / TC071 / TC072 — AI CV generation (BUG-015)</h3>
  <p>The AI endpoint proxies to <b>Google Gemini 2.5 Flash</b>. When the model replies
  <b>503 Service Unavailable</b>, Jobrator neither retries nor degrades — it returns 500 and the UI
  shows a dead-end <b>"Error writing via AI"</b> modal that discards the user's typed input.</p>
  <div class="err mono">POST https://api.jobrator.com/api/account/ai/generate
&#8594; 500 {"message":"Failed to generate text",
     "error":"[GoogleGenerativeAI Error]: ... gemini-2.5-flash:generateContent:
      [503 Service Unavailable] This model is currently experiencing high demand.
      Spikes in demand are usually temporary. Please try again later."}</div>
  <ul>
    <li><b>Intermittent, roughly 1 attempt in 3.</b> A three-attempt probe gave 500 / 200 / 200; a
        sequential re-run of the three scenarios gave 2 failed / 1 passed. The endpoint is wired
        correctly — the defect is purely the unhandled upstream 503.</li>
    <li>This is a <b>paid, subscription-gated feature</b> failing for a third of attempts, with no
        retry button and no preservation of what the user typed.</li>
    <li><b>Secondary:</b> the 500 body forwards Gemini's raw error verbatim, disclosing the model,
        provider and upstream URL to the client.</li>
  </ul>
</section>

<section>
  <h2>6. Recommended actions</h2>
  <table>
    <thead><tr><th style="width:26px">#</th><th>Action</th><th style="width:78px">Owner</th><th style="width:58px">Priority</th></tr></thead>
    <tbody>
      <tr><td>1</td><td><b>Rotate the <span class="mono">admin@jobrator.com</span> provider credentials now</b> (BUG-014) and treat them as compromised — they have been publicly readable for as long as the code has been deployed. Then move the token exchange server-side.</td><td>Security</td><td>P1</td></tr>
      <tr><td>2</td><td>Fix <b>BUG-013</b> — VNIN verification returns <span class="mono">auth_token: null</span>; the feature is non-functional for every user. May be resolved by the BUG-014 rotation.</td><td>Backend</td><td>P1</td></tr>
      <tr><td>3</td><td>Fix <b>BUG-015</b> — add bounded retry with backoff around the Gemini call, stop forwarding the provider error body, and keep the user's input on failure.</td><td>Backend</td><td>High</td></tr>
      <tr><td>4</td><td>Convert TC_VN002's <span class="mono">return 'skipped'</span> into a hard assertion so BUG-013 shows as a failure, not a silent skip. Fix TC_VN005's vacuous <span class="mono">Then</span> and selector; retarget TC_VN003 so it stops passing for the wrong reason.</td><td>QA</td><td>P2</td></tr>
      <tr><td>5</td><td>Fix the two test bugs — TC_CP004 (pick an unselected skill) and TC_EMSG003 (thread-free account, or drop the scenario).</td><td>QA</td><td>P2</td></tr>
      <tr><td>6</td><td>Investigate the four flaky scenarios under parallelism (TC_EREG012, TC_ACC006, TC_AJP002, TC_REG005) — all passed sequentially, so the suite's <span class="mono">parallel: 2</span> setting is the likely factor.</td><td>QA</td><td>P3</td></tr>
      <tr><td>7</td><td>Adopt the standing rule: a skip requires a linked bug ID or a documented data dependency. "Environmental" without evidence is not acceptable.</td><td>QA</td><td>Process</td></tr>
    </tbody>
  </table>
</section>

${
  bugs.length
    ? `<section>
  <h2>Appendix A — Open defect log (bugs/)</h2>
  <table>
    <thead><tr><th style="width:66px">ID</th><th>Title</th><th style="width:150px">Tests re-confirming it</th></tr></thead>
    <tbody>
      ${bugs
        .map((b) => {
          const hits = failedList.filter((s) => (s.knownBugs || []).includes(b.id)).map((s) => s.tc);
          return `<tr><td class="tc">${esc(b.id)}</td><td>${esc(b.title)}</td>
            <td class="mono">${hits.length ? esc(hits.join(', ')) : '<span class="where">—</span>'}</td></tr>`;
        })
        .join('')}
    </tbody>
  </table>
</section>`
    : ''
}
`;

fs.mkdirSync(path.dirname(PDF_PATH), { recursive: true });
fs.writeFileSync(HTML_PATH, html, 'utf8');
console.log(`[qa-pdf] HTML written → ${path.relative(process.cwd(), HTML_PATH)}`);

// ── render ───────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '15mm', left: '13mm', right: '13mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="width:100%;font-family:system-ui,sans-serif;font-size:7.5px;
                  color:#898781;padding:0 13mm;display:flex;justify-content:space-between;">
        <span>Jobrator E2E — QA Review &middot; failed &amp; skipped scenarios</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>`
  });
  await browser.close();
  console.log(`[qa-pdf] PDF written  → ${path.relative(process.cwd(), PDF_PATH)}`);
  console.log(
    `[qa-pdf] ${total} scenarios: ${passed} passed, ${failed} failed, ${skipped} skipped` +
      (other ? `, ${other} other` : '')
  );
  if (total < 50) {
    console.warn(
      `[qa-pdf] WARNING: only ${total} scenarios in ${path.basename(JSON_PATH)} — this looks like a ` +
        'partial/debug run, not a full suite. The report will understate coverage.'
    );
  }
})();
