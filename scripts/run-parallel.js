#!/usr/bin/env node
/**
 * run-parallel.js — Spawns Chromium and Firefox cucumber processes in parallel.
 *
 * Default behaviour:
 *   node scripts/run-parallel.js          → runs BOTH Chrome and Firefox
 *
 * Single browser:
 *   node scripts/run-parallel.js --browser=chrome
 *   node scripts/run-parallel.js --browser=firefox
 *
 * With tag filtering:
 *   node scripts/run-parallel.js --tags="@smoke"
 *   node scripts/run-parallel.js --tags="@security and not @skip"
 *
 * Single feature file:
 *   node scripts/run-parallel.js --feature=features/auth/login.feature
 *
 * Headed mode (show the browser):
 *   node scripts/run-parallel.js --headed
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ─── Parse CLI args ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);

const getArg = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=').slice(1).join('=') : undefined;
};

const hasFlag = (name) => args.includes(`--${name}`);

const browserArg = getArg('browser'); // chrome | firefox | undefined (=both)
const tagsArg = getArg('tags');
const featureArg = getArg('feature');
const headedFlag = hasFlag('headed');

// ─── Build the cucumber command for a single browser ────────────────────────

function buildCucumberArgs(browser, tags, feature) {
  const cucumberArgs = ['cucumber-js', '--config', 'cucumber.js', '--profile', browser];
  if (tags) cucumberArgs.push('--tags', tags);
  if (feature) cucumberArgs.push(feature);
  return cucumberArgs;
}

function spawnBrowser(browserProfile, label) {
  const env = {
    ...process.env,
    BROWSER: browserProfile === 'chrome' ? 'chromium' : 'firefox',
    HEADLESS: headedFlag ? 'false' : 'true',
    FORCE_COLOR: '1'
  };

  const cucumberArgs = buildCucumberArgs(browserProfile, tagsArg, featureArg);

  console.log(`\n▶ [${label}] npx ${cucumberArgs.join(' ')}\n`);

  const child = spawn('npx', cucumberArgs, {
    env,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: process.platform === 'win32'
  });

  // Prefix every output line with the browser label so the two streams are readable
  const prefix = (data) =>
    data
      .toString()
      .split('\n')
      .filter((l) => l.length > 0)
      .map((line) => `[${label.padEnd(7)}] ${line}`)
      .join('\n');

  child.stdout.on('data', (data) => process.stdout.write(prefix(data) + '\n'));
  child.stderr.on('data', (data) => process.stderr.write(prefix(data) + '\n'));

  return new Promise((resolve) => {
    child.on('close', (code) => {
      console.log(`\n[${label}] ✓ Process exited with code ${code}\n`);
      resolve({ label, code });
    });
  });
}

// ─── Move per-browser JSON reports so they don't overwrite each other ───────

function backupReportFor(label) {
  const reportFile = path.join('reports', 'cucumber-report.json');
  if (fs.existsSync(reportFile)) {
    const target = path.join('reports', `cucumber-report-${label.toLowerCase()}.json`);
    fs.renameSync(reportFile, target);
    console.log(`[runner] Backed up ${reportFile} → ${target}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Ensure reports dir exists
  fs.mkdirSync('reports', { recursive: true });

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Jobrator BDD E2E — Parallel Test Runner                     ║');
  console.log(`║   Mode: ${(browserArg || 'BOTH (chrome + firefox)').padEnd(54)}║`);
  console.log(`║   Tags: ${(tagsArg || '(all)').padEnd(54)}║`);
  console.log(`║   Headed: ${(headedFlag ? 'YES' : 'NO').padEnd(52)}║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();
  let results = [];

  if (browserArg === 'chrome') {
    results = [await spawnBrowser('chrome', 'CHROME')];
  } else if (browserArg === 'firefox') {
    results = [await spawnBrowser('firefox', 'FIREFOX')];
  } else {
    // Run both in parallel
    results = await Promise.all([
      spawnBrowser('chrome', 'CHROME'),
      spawnBrowser('firefox', 'FIREFOX')
    ]);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  // Print summary
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Test Run Summary                                            ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  for (const r of results) {
    const status = r.code === 0 ? '✅ PASSED' : '❌ FAILED';
    console.log(`║   ${r.label.padEnd(8)} → ${status} (exit ${r.code})${' '.repeat(35)}║`.substring(0, 65));
  }
  console.log(`║   Duration: ${durationSec}s${' '.repeat(50 - durationSec.length)}║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Try to generate the consolidated HTML report
  try {
    require('./generate-report.js');
  } catch (err) {
    console.warn(`[runner] Could not generate HTML report: ${err.message}`);
  }

  // Exit non-zero if any browser failed
  const anyFailed = results.some((r) => r.code !== 0);
  process.exit(anyFailed ? 1 : 0);
}

main().catch((err) => {
  console.error('[runner] Fatal error:', err);
  process.exit(2);
});
