/**
 * sprint54_probes.ts — targeted retests for Sprint 54 bugs that have no
 * equivalent scenario in the suite.
 *
 * Covers ADO #28140 (CV list stale until refresh), #29945 (invalid-credential
 * modal), #28941 / #29062 (skill-test notifications) and #29064 (skill test
 * still available on an expired job).
 *
 *   npx ts-node src/scripts/sprint54_probes.ts [probe...]
 */
import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SHOT_DIR = path.resolve(process.cwd(), 'reports/sprint54');
const results: Record<string, { verdict: string; evidence: string[] }> = {};

const shot = async (page: Page, name: string) => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: true }).catch(() => {});
};

function record(id: string, verdict: string, evidence: string[]) {
  results[id] = { verdict, evidence };
  console.log(`\n──── ${id}: ${verdict}`);
  evidence.forEach((e) => console.log(`     ${e}`));
}

/** #29945 — does an error modal/message appear on invalid credentials? */
async function probe29945(browser: Browser, site: string, email: string) {
  const page = await (await browser.newContext()).newPage();
  const ev: string[] = [];
  const { LoginPage } = await import('../pages/LoginPage');
  const lp = new LoginPage(page);
  await lp.navigate();
  await lp.login(email, 'DefinitelyWrong@123');
  await page.waitForTimeout(4000);

  // Anything that could carry the failure message to the user.
  const candidates = [
    '.swal2-popup', '.swal2-container', '[role="dialog"]', '.modal.show', '.modal-content',
    '.Toastify__toast', '.toast', '.alert-danger', '.error-message', '.invalid-feedback',
    '.text-danger', '[class*="error" i]',
  ];
  const found: string[] = [];
  for (const sel of candidates) {
    const loc = page.locator(sel);
    const n = await loc.count().catch(() => 0);
    for (let i = 0; i < Math.min(n, 5); i++) {
      const el = loc.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      const txt = ((await el.textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
      if (txt) found.push(`${sel} → "${txt.slice(0, 160)}"`);
    }
  }
  const body = ((await page.textContent('body').catch(() => '')) ?? '').replace(/\s+/g, ' ');
  const hasWording = /invalid credentials|incorrect password|wrong password|invalid email|not found/i.test(body);

  ev.push(`URL after submit: ${page.url()}`);
  ev.push(`Visible error containers: ${found.length ? found.join(' | ') : 'NONE'}`);
  ev.push(`Failure wording anywhere in page text: ${hasWording}`);
  await shot(page, '29945-invalid-credentials');

  const ok = found.length > 0 || hasWording;
  record(
    '#29945',
    ok ? 'PASS — a visible invalid-credential message/modal is shown' : 'FAIL — no visible error modal or message after invalid login',
    ev,
  );
  await page.context().close();
}

/** #28140 — does an uploaded CV appear in the list without a page refresh? */
async function probe28140(browser: Browser, site: string, email: string, password: string) {
  const page = await (await browser.newContext()).newPage();
  const ev: string[] = [];
  const { LoginPage } = await import('../pages/LoginPage');
  const { CvUploadPage } = await import('../pages/CvUploadPage');

  const lp = new LoginPage(page);
  await lp.navigate();
  await lp.login(email, password);
  await page.waitForURL(/dashboard|jobs|home/i, { timeout: 60000 }).catch(() => {});

  const cv = new CvUploadPage(page);
  await cv.goToCvSection();
  const before = await cv.getCvCount();
  ev.push(`CV count before upload (after clearing): ${before}`);

  await cv.uploadFile('pdf');
  const success = await cv.isUploadSuccessVisible();
  ev.push(`Upload success popup shown: ${success}`);
  await cv.clickOkOnSuccessPopup().catch(() => {});
  await page.waitForTimeout(3000);

  const afterNoReload = await cv.getCvCount();
  ev.push(`CV count WITHOUT refresh: ${afterNoReload}`);
  await shot(page, '28140-after-upload-no-refresh');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const afterReload = await cv.getCvCount();
  ev.push(`CV count AFTER refresh: ${afterReload}`);
  await shot(page, '28140-after-refresh');

  let verdict: string;
  if (afterNoReload > before) {
    verdict = 'PASS — the uploaded CV appears in the list without a refresh';
  } else if (afterReload > before) {
    verdict = 'FAIL — CV only appears after a manual page refresh (bug reproduces)';
  } else {
    verdict = `INCONCLUSIVE — CV count did not increase even after refresh (before=${before}, after=${afterReload})`;
  }
  record('#28140', verdict, ev);
  await page.context().close();
}

/** #28941 / #29062 — skill-test notifications in the bell / notifications feed. */
async function probeNotifications(browser: Browser, site: string, email: string, password: string) {
  const page = await (await browser.newContext()).newPage();
  const ev: string[] = [];
  const { LoginPage } = await import('../pages/LoginPage');
  const lp = new LoginPage(page);
  await lp.navigate();
  await lp.login(email, password);
  await page.waitForURL(/dashboard|jobs|home/i, { timeout: 60000 }).catch(() => {});

  const apiHits: string[] = [];
  page.on('response', (r) => {
    if (/notification/i.test(r.url())) apiHits.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });

  // Try the notifications route directly, then fall back to the bell control.
  let reached = false;
  for (const route of ['/dashboard/notifications', '/notifications', '/dashboard/notification']) {
    await page.goto(site + route, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(3000);
    if (!/404|not found/i.test(((await page.textContent('body').catch(() => '')) ?? ''))) {
      reached = true;
      ev.push(`Notifications route reached: ${route} → ${page.url()}`);
      break;
    }
  }
  if (!reached) ev.push('No notifications route resolved');

  const bodyText = ((await page.textContent('body').catch(() => '')) ?? '').replace(/\s+/g, ' ');
  const skillTestMentions = /skill test/i.test(bodyText);
  const expiryMentions = /48\s*h|24\s*h|2\s*h|expir/i.test(bodyText);

  ev.push(`"skill test" appears in notifications feed: ${skillTestMentions}`);
  ev.push(`expiry-reminder wording (48h/24h/2h/expire) appears: ${expiryMentions}`);
  ev.push(`notification API calls: ${apiHits.length ? apiHits.slice(0, 5).join(' | ') : 'none observed'}`);
  await shot(page, 'notifications-feed');

  record(
    '#28941',
    skillTestMentions
      ? 'PARTIAL — skill-test notification content present in-app (email delivery not verifiable here)'
      : 'FAIL — no skill-test notification found in the in-app feed',
    ev,
  );
  record(
    '#29062',
    expiryMentions && skillTestMentions
      ? 'PARTIAL — expiry-reminder notifications present in-app'
      : 'FAIL — no 48h/24h/2h skill-test expiry reminders in the in-app feed',
    ev,
  );
  await page.context().close();
}

/** #29064 — can a skill test still be started on an expired job? */
async function probe29064(browser: Browser, site: string, email: string, password: string) {
  const page = await (await browser.newContext()).newPage();
  const ev: string[] = [];
  const { LoginPage } = await import('../pages/LoginPage');
  const lp = new LoginPage(page);
  await lp.navigate();
  await lp.login(email, password);
  await page.waitForURL(/dashboard|jobs|home/i, { timeout: 60000 }).catch(() => {});

  await page.goto(site + '/dashboard/applied-jobs', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(4000);
  const bodyText = ((await page.textContent('body').catch(() => '')) ?? '').replace(/\s+/g, ' ');
  ev.push(`Applied-jobs URL: ${page.url()}`);

  const expiredMarkers = (bodyText.match(/expired/gi) || []).length;
  const takeTestBtns = await page
    .locator('button:has-text("Take Test"), a:has-text("Take Test"), button:has-text("Start Test"), a:has-text("Start Test"), :text("Skill Test")')
    .count()
    .catch(() => 0);

  ev.push(`"Expired" markers on applied jobs: ${expiredMarkers}`);
  ev.push(`Take/Start Test controls found: ${takeTestBtns}`);
  await shot(page, '29064-applied-jobs');

  let verdict: string;
  if (expiredMarkers === 0) {
    verdict = 'BLOCKED — no expired job application on this account; cannot exercise the expired-test path';
  } else if (takeTestBtns > 0) {
    verdict = 'FAIL (likely) — expired application present and a test control is still rendered; needs manual confirmation of which job it belongs to';
  } else {
    verdict = 'PASS (likely) — expired application present and no test control is offered';
  }
  record('#29064', verdict, ev);
  await page.context().close();
}

(async () => {
  const { EnvConfig } = await import('../config/env.config');
  const env = EnvConfig.getInstance();
  const site = env.jobratorSite.replace(/\/$/, '');
  const email = env.candidateEmail;
  const password = env.candidatePassword;

  const which = process.argv.slice(2);
  const run = (n: string) => which.length === 0 || which.includes(n);

  const browser = await chromium.launch({ headless: true });
  try {
    if (run('29945')) await probe29945(browser, site, email).catch((e) => record('#29945', `ERROR — ${e.message}`, []));
    if (run('28140')) await probe28140(browser, site, email, password).catch((e) => record('#28140', `ERROR — ${e.message}`, []));
    if (run('notif')) await probeNotifications(browser, site, email, password).catch((e) => record('#28941', `ERROR — ${e.message}`, []));
    if (run('29064')) await probe29064(browser, site, email, password).catch((e) => record('#29064', `ERROR — ${e.message}`, []));
  } finally {
    await browser.close();
  }

  fs.mkdirSync(SHOT_DIR, { recursive: true });
  fs.writeFileSync(path.join(SHOT_DIR, 'probe-results.json'), JSON.stringify(results, null, 2));
  console.log('\n════════ PROBE SUMMARY ════════');
  for (const [id, r] of Object.entries(results)) console.log(`${id.padEnd(8)} ${r.verdict}`);
})();
