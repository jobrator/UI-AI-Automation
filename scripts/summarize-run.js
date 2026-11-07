#!/usr/bin/env node
/**
 * summarize-run.js — Prints a per-feature pass/fail/skip breakdown of a Cucumber
 * JSON run, then lists every failing scenario with its first failing step.
 *
 * Reads:   reports/cucumber-report-fullrun.json if present, else
 *          reports/cucumber-report.json   (override with --json <path>)
 *
 * Usage:   node scripts/summarize-run.js [--json <path>] [--failures-only]
 *
 * Why the snapshot is preferred: every cucumber run rewrites
 * reports/cucumber-report.json, so running one scenario to debug it clobbers a
 * full-suite report. After a full run, snapshot it:
 *     cp reports/cucumber-report.json reports/cucumber-report-fullrun.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Args ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const getArg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : undefined;
};
const failuresOnly = argv.includes('--failures-only');

const explicit = getArg('json');
const candidates = explicit
  ? [explicit]
  : [
      path.join('reports', 'cucumber-report-fullrun.json'),
      path.join('reports', 'cucumber-report.json')
    ];

const jsonPath = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).size > 0);

if (!jsonPath) {
  console.error(`[summary] No cucumber JSON found. Looked for:\n  ${candidates.join('\n  ')}`);
  process.exit(1);
}

let features;
try {
  features = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
} catch (err) {
  console.error(`[summary] ${jsonPath} is not valid JSON: ${err.message}`);
  process.exit(1);
}

// ─── Walk the report ─────────────────────────────────────────────────────────

/**
 * A scenario's status is the worst status among its steps: a single failed step
 * fails the scenario; otherwise any undefined/pending/skipped step means it did
 * not fully run; only all-passed counts as passed.
 */
function scenarioStatus(element) {
  const steps = element.steps || [];
  const statuses = steps.map((s) => (s.result && s.result.status) || 'unknown');
  if (statuses.includes('failed')) return 'failed';
  if (statuses.includes('undefined')) return 'undefined';
  if (statuses.includes('pending')) return 'pending';
  if (statuses.includes('ambiguous')) return 'ambiguous';
  if (statuses.length && statuses.every((s) => s === 'passed')) return 'passed';
  if (statuses.includes('skipped')) return 'skipped';
  return 'unknown';
}

function firstFailure(element) {
  for (const step of element.steps || []) {
    if (step.result && step.result.status === 'failed') {
      const name = `${(step.keyword || '').trim()} ${step.name || '(hook)'}`.trim();
      const msg = (step.result.error_message || '').split('\n')[0].slice(0, 220);
      return { step: name, message: msg };
    }
  }
  return null;
}

const perFeature = new Map();
const failures = [];
const totals = { passed: 0, failed: 0, skipped: 0, undefined: 0, pending: 0, ambiguous: 0, unknown: 0 };
let totalDurationNs = 0;

for (const feature of features) {
  const fname = feature.name || feature.uri || '(unnamed feature)';
  if (!perFeature.has(fname)) {
    perFeature.set(fname, { passed: 0, failed: 0, other: 0, uri: feature.uri });
  }
  const bucket = perFeature.get(fname);

  for (const element of feature.elements || []) {
    if (element.type && element.type !== 'scenario') continue;

    for (const step of element.steps || []) {
      if (step.result && typeof step.result.duration === 'number') {
        totalDurationNs += step.result.duration;
      }
    }

    const status = scenarioStatus(element);
    totals[status] = (totals[status] || 0) + 1;

    if (status === 'passed') bucket.passed += 1;
    else if (status === 'failed') bucket.failed += 1;
    else bucket.other += 1;

    if (status === 'failed') {
      const tags = (element.tags || []).map((t) => t.name).join(' ');
      failures.push({
        feature: fname,
        scenario: element.name,
        tags,
        ...(firstFailure(element) || { step: '(no failed step recorded)', message: '' })
      });
    }
  }
}

const totalScenarios = Object.values(totals).reduce((a, b) => a + b, 0);
const notRun = totalScenarios - totals.passed - totals.failed;

// ─── Print ───────────────────────────────────────────────────────────────────

const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);

console.log(`\nSource: ${jsonPath}`);
console.log(`Scenarios: ${totalScenarios}   passed: ${totals.passed}   failed: ${totals.failed}   not fully run: ${notRun}`);
if (totalScenarios > 0) {
  const rate = ((totals.passed / totalScenarios) * 100).toFixed(1);
  console.log(`Pass rate: ${rate}%   Step time: ${(totalDurationNs / 1e9 / 60).toFixed(1)} min (summed across workers)`);
}

if (!failuresOnly) {
  console.log('\n─── Per feature ───────────────────────────────────────────────────────');
  console.log(`${pad('FEATURE', 52)} ${lpad('PASS', 5)} ${lpad('FAIL', 5)} ${lpad('OTHER', 6)}`);
  const rows = [...perFeature.entries()].sort((a, b) => b[1].failed - a[1].failed || a[0].localeCompare(b[0]));
  for (const [name, c] of rows) {
    const flag = c.failed > 0 ? ' ✗' : '';
    console.log(`${pad(name.slice(0, 52), 52)} ${lpad(c.passed, 5)} ${lpad(c.failed, 5)} ${lpad(c.other, 6)}${flag}`);
  }
}

if (failures.length) {
  console.log('\n─── Failing scenarios ─────────────────────────────────────────────────');
  let i = 1;
  for (const f of failures) {
    console.log(`\n${i++}. ${f.scenario}`);
    console.log(`   feature: ${f.feature}`);
    if (f.tags) console.log(`   tags:    ${f.tags}`);
    console.log(`   step:    ${f.step}`);
    if (f.message) console.log(`   error:   ${f.message}`);
  }
  console.log('');
} else {
  console.log('\nNo failing scenarios.\n');
}
