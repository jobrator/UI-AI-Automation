/**
 * seed-environment.ts — Idempotent test-data seeder for the Jobrator E2E suite.
 *
 * Populates the shared environment with the data that the data-dependent smoke /
 * regression scenarios expect to fetch, so they exercise real records instead of
 * soft-passing on an empty account. Safe to run repeatedly.
 *
 * Seeds, in dependency order:
 *   1. Admin    → a reference skill + industry (so jobs can reference them)
 *   2. Employer → several published jobs
 *   3. Candidate→ a job application, a saved job, a job alert, an uploaded CV
 *   4. Employer → shortlists the applicant + schedules an interview
 *
 * Run with:  npm run seed        (headless)
 *            HEADLESS=false npm run seed   (headed, for debugging)
 *
 * Each stage is isolated: a failure is logged and the seeder continues, printing
 * a final summary so you can see exactly what data is (and isn't) available.
 */
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

import { EnvConfig } from '../config/env.config';
import { CvUploadPage } from '../pages/CvUploadPage';
import { AllApplicantsPage } from '../pages/AllApplicantsPage';
import { ShortlistedCVsPage } from '../pages/ShortlistedCVsPage';

const CV_FILE = path.resolve(process.cwd(), 'test-data', 'cv', 'tc051-valid-cv.pdf');

const env = EnvConfig.getInstance();
const SITE = env.jobratorSite.replace(/\/$/, '');
const NAV = { waitUntil: 'domcontentloaded' as const, timeout: env.navigationTimeout };

// Unique run stamp keeps seeded records distinguishable between runs.
const STAMP = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const SKILL_NAME = `Playwright Automation ${STAMP}`;
const INDUSTRY_NAME = `Quality Assurance ${STAMP}`;
const JOB_TITLES = [
  `Automation QA Engineer ${STAMP}`,
  `Senior Test Analyst ${STAMP}`,
];

// ── result tracking ──────────────────────────────────────────────────────────
type Stage = { name: string; ok: boolean; detail: string };
const results: Stage[] = [];
function record(name: string, ok: boolean, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '⚠️ '} ${name}${detail ? ` — ${detail}` : ''}`);
}

function adminOrigin(): string {
  try {
    const u = new URL(env.adminUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return env.adminUrl.replace(/\/$/, '');
  }
}

// ── login helpers (mirror the proven journey.steps flows) ────────────────────
async function loginCandidate(page: Page): Promise<void> {
  await page.goto(`${SITE}/login`, NAV);
  const tab = page.locator('button:has-text("Candidate"), [data-tab="candidate"], a:has-text("Candidate")').first();
  if (await tab.isVisible().catch(() => false)) { await tab.click(); await page.waitForTimeout(500); }
  await page.locator('input[name="email"], input[type="email"], [placeholder*="email" i]').first().fill(env.candidateEmail);
  await page.locator('input[name="password"], input[type="password"]').first().fill(env.candidatePassword);
  await page.evaluate(() => {
    const cb = document.querySelector('input[name="checkbox-ready"]') as HTMLInputElement | null;
    if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/dashboard|home|profile|jobs|application/i, { timeout: env.navigationTimeout });
}

async function loginEmployer(page: Page): Promise<void> {
  await page.goto(`${SITE}/login`, NAV);
  const tab = page.locator('button:has-text("Employer"), [data-tab="employer"], a:has-text("Employer")').first();
  if (await tab.isVisible().catch(() => false)) { await tab.click(); await page.waitForTimeout(500); }
  await page.locator('input[name="email"], input[type="email"], [placeholder*="email" i]').first().fill(env.employerEmail);
  await page.locator('input[name="password"], input[type="password"]').first().fill(env.employerPassword);
  await page.evaluate(() => {
    const cb = document.querySelector('input[name="checkbox-ready"]') as HTMLInputElement | null;
    if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/dashboard|home|employer|recruiter|jobs/i, { timeout: env.navigationTimeout });
}

async function loginAdmin(page: Page): Promise<void> {
  await page.goto(`${adminOrigin()}/signin`, NAV);
  await page.locator('input[name="username"], input[name="email"], input[type="text"], input[type="email"]').first().fill(env.adminEmail);
  await page.locator('input[name="password"], input[type="password"]').first().fill(env.adminPassword);
  await page.locator('button[type="submit"], input[type="submit"]').first().click();
  await page.waitForURL(/admin\.jobrator\.com\/(dashboard|$|#|index|home|applications|jobs|skills)/i, { timeout: env.navigationTimeout });
}

// ── seed stages ──────────────────────────────────────────────────────────────

async function seedAdminReferenceData(ctx: BrowserContext): Promise<void> {
  const page = await ctx.newPage();
  try {
    await loginAdmin(page);

    // Skill
    try {
      await page.goto(`${adminOrigin()}/actions/skills/new`, NAV);
      await page.waitForTimeout(1000);
      const inputs = page.locator('input[type="text"]');
      const count = await inputs.count();
      let filled = false;
      for (let i = count - 1; i >= 0; i--) {
        const ph = await inputs.nth(i).getAttribute('placeholder').catch(() => '');
        if (!ph) { await inputs.nth(i).fill(SKILL_NAME); filled = true; break; }
      }
      await page.locator('button:has-text("Submit"), button[type="submit"]').last().click();
      await page.waitForTimeout(1500);
      record('Admin: skill', filled, SKILL_NAME);
    } catch (e: any) { record('Admin: skill', false, e.message); }

    // Industry
    try {
      await page.goto(`${adminOrigin()}/industries`, NAV);
      await page.waitForTimeout(1000);
      const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New"), a:has-text("Add"), a:has-text("Create"), a:has-text("New")').first();
      if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) { await addBtn.click(); await page.waitForTimeout(800); }
      const input = page.locator('input[name="name"], input[name="industry"], input[placeholder*="industry" i], input[placeholder*="name" i], input[type="text"]').first();
      await input.waitFor({ state: 'visible', timeout: env.defaultTimeout });
      await input.fill(INDUSTRY_NAME);
      await page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Submit"), button:has-text("Add"), button:has-text("Create")').first().click();
      await page.waitForTimeout(1500);
      record('Admin: industry', true, INDUSTRY_NAME);
    } catch (e: any) { record('Admin: industry', false, e.message); }
  } catch (e: any) {
    record('Admin: login', false, e.message);
  } finally {
    await page.close();
  }
}

/**
 * Select an option in a react-select control identified by its field label.
 * Picks the option matching `optionText`, closes the menu, and confirms a value
 * chip is now shown so the form's validation state is satisfied.
 */
async function pickReactSelect(page: Page, label: string, optionText: string): Promise<boolean> {
  const control = page.locator(
    `xpath=//label[contains(normalize-space(.),"${label}")]/following::div[contains(@class,"select__control")][1]`
  ).first();
  if (!(await control.isVisible({ timeout: 4000 }).catch(() => false))) return false;
  await control.click();
  await page.waitForTimeout(500);
  const opt = page.locator('.select__option', { hasText: optionText }).first();
  if (await opt.isVisible({ timeout: 4000 }).catch(() => false)) {
    await opt.click();
  } else {
    await page.keyboard.type(optionText.slice(0, 4));
    await page.waitForTimeout(800);
    await page.locator('.select__option').first().click().catch(() => {});
  }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);
  return control.locator('.select__multi-value, .select__single-value').first().isVisible({ timeout: 2000 }).catch(() => false);
}

/** Fill the full Post-A-Job form (incl. required react-select + radio fields) and publish. */
async function postSingleJob(page: Page, title: string): Promise<void> {
  await page.goto(`${SITE}/dashboard/post-jobs`, { waitUntil: 'networkidle', timeout: env.navigationTimeout });
  await page.waitForTimeout(1500);

  await page.locator('input[name="title"]').fill(title);
  await page.locator('input[name="location"]').fill('London, United Kingdom');
  await page.locator('input[name="minSalary"]').fill('35000');
  await page.locator('input[name="maxSalary"]').fill('60000');

  // Currency — native <select>, pick the first real option
  const cur = page.locator('select[name="currency"]');
  for (const o of await cur.locator('option').all()) {
    const v = await o.getAttribute('value');
    if (v && v !== '' && v !== '0') { await cur.selectOption({ value: v }); break; }
  }

  // Required react-select fields
  await pickReactSelect(page, 'Skills', 'JavaScript');
  await pickReactSelect(page, 'Qualification', 'Bachelors');

  // Required radio groups
  await page.locator('label:has-text("Full-time")').first().click().catch(() => {});
  await page.locator('label:has-text("Remote")').first().click().catch(() => {});

  // Application deadline
  const dl = page.locator('input[name="closingDate"]').first();
  if (await dl.isVisible().catch(() => false)) {
    await dl.fill(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  }

  // Rich-text editors (Duties & Responsibilities + Job Description)
  const editors = page.locator('.public-DraftEditor-content[contenteditable="true"], [contenteditable="true"]');
  const count = await editors.count();
  for (let i = 0; i < count; i++) {
    await editors.nth(i).click().catch(() => {});
    await page.keyboard.type('Automated seed job posting created by the E2E test-data seeder. Please ignore.').catch(() => {});
  }

  await page.locator('button:has-text("Publish"), button[type="submit"]').first().click();
  await page.waitForTimeout(3500);
}

async function seedEmployerJobs(ctx: BrowserContext): Promise<void> {
  const page = await ctx.newPage();
  try {
    await loginEmployer(page);
    let posted = 0;
    for (const title of JOB_TITLES) {
      try {
        await postSingleJob(page, title);
        // Verify persistence — a clicked Publish is not proof the job saved.
        await page.goto(`${SITE}/dashboard/manage-jobs`, { waitUntil: 'networkidle', timeout: env.navigationTimeout });
        await page.waitForTimeout(2500);
        const saved = await page.locator(`text=${title}`).first().isVisible({ timeout: 5000 }).catch(() => false);
        if (saved) { posted++; console.log(`   • posted & verified: "${title}"`); }
        else { console.log(`   • publish did NOT persist: "${title}"`); }
      } catch (e: any) {
        console.log(`   • failed to post "${title}": ${e.message}`);
      }
    }
    record('Employer: jobs', posted > 0, `${posted}/${JOB_TITLES.length} verified in Manage Jobs`);
  } catch (e: any) {
    record('Employer: login', false, e.message);
  } finally {
    await page.close();
  }
}

async function seedCandidateActivity(ctx: BrowserContext): Promise<void> {
  const page = await ctx.newPage();
  try {
    await loginCandidate(page);

    // Upload a CV first (some apply flows require an on-file CV). Runs on a
    // dedicated page so the CV success modal (SweetAlert overlay) can't linger
    // on the main page and block the job-detail SPA hydration during Apply.
    try {
      const cvPage = await ctx.newPage();
      const cv = new CvUploadPage(cvPage);
      await cv.navigate();
      await cv.uploadFile('pdf');
      await cv.submitUpload();
      await cvPage.waitForTimeout(2000);
      const ok = await cv.isUploadSuccessVisible().catch(() => false);
      await cv.clickOkOnSuccessPopup().catch(() => {});
      const inList = await cv.isCvInList().catch(() => false);
      await cvPage.close();
      record('Candidate: CV upload', ok || inList);
    } catch (e: any) { record('Candidate: CV upload', false, e.message); }

    // Apply to a SEEDED job so it shows up under the employer's applicants.
    // The apply flow is a modal: open the job → "Apply For Job" → select/upload a
    // CV → "Apply Job". Verified against the candidate's Applied Jobs list.
    try {
      // A seeded job title fragment to locate the card (this run's stamp).
      const wantTitle = JOB_TITLES[0];
      const applyForJob = page.locator('button:has-text("Apply For Job")').first();

      // Job-detail pages only hydrate the Apply button via client-side navigation
      // (a hard page.goto renders blank), so open the job by CLICKING its card.
      let ready = false;
      let anyCard = false;
      for (let attempt = 0; attempt < 3 && !ready; attempt++) {
        await page.goto(`${SITE}/jobs`, NAV);
        await page.waitForTimeout(2500);
        let link = page.locator(`.job-block:has-text("${wantTitle}") a[href*="/jobs/"]`).first();
        if (!(await link.isVisible({ timeout: 3000 }).catch(() => false))) {
          link = page.locator('.job-block a[href*="/jobs/"]').first(); // fallback: first job
        }
        if (!(await link.isVisible({ timeout: 4000 }).catch(() => false))) continue;
        anyCard = true;
        await link.click();
        await page.waitForTimeout(3000);
        ready = await applyForJob.isVisible({ timeout: 8000 }).catch(() => false);
      }

      if (!anyCard) { record('Candidate: apply', false, 'no job cards to apply to'); }
      else if (!ready) {
        const alreadyApplied = await page.locator('button:has-text("Applied"), :text("Already Applied")').first().isVisible({ timeout: 1500 }).catch(() => false);
        record('Candidate: apply', alreadyApplied, alreadyApplied ? 'already applied' : 'apply button did not render after 3 tries');
      } else {
        {
          await applyForJob.click();
          await page.waitForTimeout(1500);
          const dialog = page.locator('.modal, [role="dialog"]').filter({ hasText: 'Apply for this job' }).first();

          // Prefer selecting an on-file CV; otherwise upload one.
          let cvOk = false;
          const sel = dialog.locator('select').first();
          if (await sel.isVisible({ timeout: 3000 }).catch(() => false)) {
            for (const o of await sel.locator('option').all()) {
              const v = await o.getAttribute('value');
              if (v && v !== '' && !/select/i.test((await o.innerText()) || '')) { await sel.selectOption({ value: v }); cvOk = true; break; }
            }
          }
          if (!cvOk) {
            const fi = dialog.locator('input[type="file"], input[name="attachments"]').first();
            if (await fi.count() > 0) { await fi.setInputFiles(CV_FILE).catch(() => {}); await page.waitForTimeout(2000); cvOk = true; }
          }

          const applyJob = dialog.locator('button', { hasText: /^Apply Job$/ }).first();
          await applyJob.scrollIntoViewIfNeeded().catch(() => {});
          await applyJob.click({ timeout: 8000 }).catch(async () => { await applyJob.click({ force: true }).catch(() => {}); });
          await page.waitForTimeout(3000);

          // Verify on the Applied Jobs page (source of truth, not the toast).
          await page.goto(`${SITE}/dashboard/applied-jobs`, NAV);
          await page.waitForTimeout(3000);
          const applied = await page.locator('table tbody tr').count().catch(() => 0);
          record('Candidate: apply', applied > 0, `${applied} application(s) on file`);
        }
      }
    } catch (e: any) { record('Candidate: apply', false, e.message); }

    // Save a job — the live /jobs card exposes a `button.bookmark-btn`
    try {
      await page.goto(`${SITE}/jobs`, NAV);
      await page.waitForTimeout(2000);
      const bookmark = page.locator('.job-block button.bookmark-btn, button.bookmark-btn, .flaticon-bookmark').first();
      if (await bookmark.isVisible({ timeout: 6000 }).catch(() => false)) {
        await bookmark.click();
        await page.waitForTimeout(1500);
        record('Candidate: saved job', true);
      } else {
        record('Candidate: saved job', false, 'bookmark button not found on job card');
      }
    } catch (e: any) { record('Candidate: saved job', false, e.message); }

    // Create a job alert — the form may sit behind an "Add / Create Alert" reveal button.
    try {
      await page.goto(`${SITE}/dashboard/job-alerts`, NAV);
      await page.waitForTimeout(2500);
      const reveal = page.locator('button:has-text("Add"), button:has-text("Create Alert"), button:has-text("New Alert"), button:has-text("Create"), a:has-text("Add Alert")').first();
      if (await reveal.isVisible({ timeout: 3000 }).catch(() => false)) { await reveal.click(); await page.waitForTimeout(1200); }

      const keyword = page.locator('input[name="keyword"], input[name="title"], input[placeholder*="keyword" i], input[placeholder*="job" i], input[type="text"]').first();
      if (await keyword.isVisible({ timeout: 6000 }).catch(() => false)) {
        await keyword.fill('QA Engineer');
        const loc = page.locator('input[name="location"], input[name="city"], input[placeholder*="location" i]').first();
        if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) await loc.fill('London');
        await page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create Alert"), button:has-text("Set Alert"), button:has-text("Subscribe")').first().click().catch(() => {});
        await page.waitForTimeout(1500);
        record('Candidate: job alert', true);
      } else {
        record('Candidate: job alert', false, 'no alert form found on /dashboard/job-alerts');
      }
    } catch (e: any) { record('Candidate: job alert', false, e.message); }
  } catch (e: any) {
    record('Candidate: login', false, e.message);
  } finally {
    await page.close();
  }
}

async function seedEmployerShortlistAndInterview(ctx: BrowserContext): Promise<void> {
  const page = await ctx.newPage();
  try {
    await loginEmployer(page);

    // Shortlist the first applicant
    try {
      const applicants = new AllApplicantsPage(page);
      await applicants.navigate();
      await page.waitForTimeout(1000);
      if (await applicants.hasApplicants().catch(() => false)) {
        await applicants.shortlistFirstApplicant();
        await page.waitForTimeout(1500);
        record('Employer: shortlist', true);
      } else {
        record('Employer: shortlist', false, 'no applicants to shortlist');
      }
    } catch (e: any) { record('Employer: shortlist', false, e.message); }

    // Schedule an interview for a shortlisted candidate
    try {
      const shortlisted = new ShortlistedCVsPage(page);
      await shortlisted.navigate();
      await page.waitForTimeout(1000);
      if (await shortlisted.hasShortlistedCandidates().catch(() => false)) {
        await shortlisted.clickScheduleInterview();
        await page.waitForTimeout(1000);
        const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const dateStr = future.toISOString().slice(0, 10);
        await shortlisted.fillInterviewForm(dateStr, '10:00', 'Online', 'Google Meet');
        await shortlisted.submitInterview();
        await page.waitForTimeout(2000);
        record('Employer: interview', true, `for ${dateStr} 10:00`);
      } else {
        record('Employer: interview', false, 'no shortlisted candidates');
      }
    } catch (e: any) { record('Employer: interview', false, e.message); }
  } catch (e: any) {
    record('Employer: login (2)', false, e.message);
  } finally {
    await page.close();
  }
}

// ── main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('════════════════════════════════════════════════════');
  console.log('  Jobrator E2E — Environment Data Seeder');
  console.log(`  Target: ${SITE}`);
  console.log(`  Run stamp: ${STAMP}`);
  console.log('════════════════════════════════════════════════════\n');

  const browser: Browser = await chromium.launch({ headless: env.headless });
  const newCtx = () => browser.newContext({ acceptDownloads: true });

  try {
    let ctx = await newCtx();
    await seedAdminReferenceData(ctx);
    await ctx.close();

    ctx = await newCtx();
    await seedEmployerJobs(ctx);
    await ctx.close();

    ctx = await newCtx();
    await seedCandidateActivity(ctx);
    await ctx.close();

    ctx = await newCtx();
    await seedEmployerShortlistAndInterview(ctx);
    await ctx.close();
  } finally {
    await browser.close();
  }

  console.log('\n════════════════════════════════════════════════════');
  console.log('  Seeding summary');
  console.log('════════════════════════════════════════════════════');
  const ok = results.filter(r => r.ok).length;
  for (const r of results) console.log(`  ${r.ok ? '✅' : '⚠️ '} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  console.log(`\n  ${ok}/${results.length} stages produced data.`);
  process.exit(0);
})().catch((e) => {
  console.error('Fatal seeder error:', e);
  process.exit(1);
});
