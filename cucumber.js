// cucumber.js — Cucumber-JS multi-profile configuration
'use strict';

const common = {
  requireModule: ['ts-node/register'],
  require: [
    'src/support/world.ts',
    'src/hooks/hooks.ts',
    'src/steps/**/*.ts'
  ],
  format: [
    'progress-bar',
    'json:reports/cucumber-report.json',
    'html:reports/cucumber-report.html',
    'rerun:reports/@rerun.txt'
  ],
  formatOptions: {
    snippetInterface: 'async-await'
  },
  parallel: 3
};

module.exports = {
  // ── Run on Chromium (parallel) ──────────────────────────────────────────
  chrome: {
    ...common,
    worldParameters: { browser: 'chromium' },
    tags: 'not @skip-chrome and not @skip'
  },

  // ── Run on Firefox (parallel) ───────────────────────────────────────────
  firefox: {
    ...common,
    worldParameters: { browser: 'firefox' },
    tags: 'not @skip-firefox and not @skip'
  },

  // ── Single-browser sequential run (debugging) ──────────────────────────
  sequential: {
    ...common,
    parallel: 1,
    worldParameters: { browser: 'chromium' },
    tags: 'not @skip'
  },

  // ── Smoke tests only (fast feedback) ──────────────────────────────────
  smoke: {
    ...common,
    parallel: 2,
    worldParameters: { browser: 'chromium' },
    tags: '@smoke and not @skip'
  },

  // ── Security tests only ────────────────────────────────────────────────
  security: {
    ...common,
    parallel: 2,
    worldParameters: { browser: 'chromium' },
    tags: '@security and not @skip'
  },

  // ── Re-run previously failed tests ────────────────────────────────────
  rerun: {
    ...common,
    parallel: 1,
    worldParameters: { browser: 'chromium' },
    // eslint-disable-next-line no-template-curly-in-string
    paths: ['@reports/@rerun.txt']
  }
};
