/**
 * seed-full-environment.ts — makes every data-dependent scenario runnable.
 *
 * `npm run seed` (seed-environment.ts) covers reference data, jobs and a CV.
 * This script seeds the cross-portal records that used to make ~20 scenarios
 * skip for want of data:
 *
 *   1. employer  — at least one Published job and one Draft job
 *   2. candidate — a PDF and a DOCX CV in the CV manager
 *   3. candidate — a real application to one of the employer's jobs
 *   4. employer  — that applicant shortlisted
 *   5. employer  — an interview scheduled for the shortlisted candidate
 *   6. candidate — a conversation opened with the employer's company
 *   7. employer  — a reply in that conversation
 *   8. admin     — at least one psychometric exam
 *
 * Every stage is idempotent: it checks first and only creates what is missing.
 *
 * PREREQUISITE — the candidate account must hold an active Jobrator Plus plan.
 * Applying and the AI features are subscription-gated, and the Paystack test
 * checkout cannot be cleared headlessly (Cloudflare). Run this first, once per
 * billing period:
 *
 *   npm run seed:subscription     # headed, real Chrome
 *   npm run seed:full
 */
import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const PDF_CV = path.resolve(process.cwd(), 'test-data/cv/tc051-valid-cv.pdf');
const DOCX_CV = path.resolve(process.cwd(), 'test-data/cv/tc052-valid-cv.docx');

type Stage = { name: string; status: 'ok' | 'created' | 'failed' | 'skipped'; detail: string };
const results: Stage[] = [];
const record = (name: string, status: Stage['status'], detail = '') => {
  results.push({ name, status, detail });
  const icon = { ok: '✓', created: '+', failed: '✗', skipped: '·' }[status];
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ''}`);
};

const bodyText = async (page: Page) =>
  ((await page.textContent('body').catch(() => '')) ?? '').replace(/\s+/g, ' ');

const swalText = async (page: Page) =>
  ((await page.textContent('.swal2-popup').catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();

async function dismissSwal(page: Page) {
  const ok = page.locator('.swal2-confirm').first();
  if (await ok.isVisible().catch(() => false)) {
    await ok.click().catch(() => {});
    await page.waitForTimeout(1200);
  }
}

(async () => {
  const { LoginPage } = await import('../pages/LoginPage');
  const { EmployerLoginPage } = await import('../pages/EmployerLoginPage');
  const { AdminLoginPage } = await import('../pages/admin/AdminLoginPage');
  const { PostJobPage } = await import('../pages/PostJobPage');
  const { ManageJobsPage } = await import('../pages/ManageJobsPage');
  const { EnvConfig } = await import('../config/env.config');
  const env = EnvConfig.getInstance();
  const site = env.jobratorSite.replace(/\/$/, '');
  const adminSite = env.adminUrl.replace(/\/$/, '');

  const browser: Browser = await chromium.launch({ headless: process.env.HEADLESS !== 'false' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
  const page = await ctx.newPage();

  let companyId = '';
  let publishedTitle = '';

  // ════════════════ EMPLOYER: published + draft jobs ════════════════
  console.log('\n[1/8] Employer jobs');
  try {
    const elp = new EmployerLoginPage(page);
    await elp.navigate();
    await elp.login(env.employerEmail, env.employerPassword);
    await page.waitForURL(/dashboard/i, { timeout: 60000 }).catch(() => {});

    const manageJobs = new ManageJobsPage(page);
    await manageJobs.navigate();
    await page.waitForTimeout(4000);

    if (await manageJobs.hasJobs()) {
      publishedTitle = await manageJobs.getFirstJobTitle();
      record('published job', 'ok', `"${publishedTitle}"`);
    } else {
      const postJob = new PostJobPage(page);
      await postJob.navigate();
      publishedTitle = `Seed Published Job ${Date.now()}`;
      await postJob.fillRequiredFields({
        title: publishedTitle,
        description: 'Seeded published job for the E2E suite.',
        location: 'London, United Kingdom',
        salary: '45000',
      });
      await postJob.clickPublish();
      await page.waitForTimeout(4000);
      await dismissSwal(page);
      await manageJobs.navigate();
      record(
        'published job',
        (await manageJobs.getStatusForJob(publishedTitle)) ? 'created' : 'failed',
        `"${publishedTitle}"`
      );
    }

    if (await manageJobs.hasDraftJobs()) {
      record('draft job', 'ok');
    } else {
      // "Publish Later" stores the job with isDraft=true: it shows a "Draft"
      // status in Manage Jobs and stays off the public /jobs listing. It still
      // runs full validation, so the whole required set has to be filled.
      const postJob = new PostJobPage(page);
      await postJob.navigate();
      const draftTitle = `Seed Draft Job ${Date.now()}`;
      await postJob.fillRequiredFields({
        title: draftTitle,
        description: 'Seeded draft job for the E2E suite.',
        location: 'London, United Kingdom',
        salary: '40000',
      });
      await postJob.clickSaveDraft();
      await page.waitForTimeout(4000);
      await dismissSwal(page);
      await manageJobs.navigate();
      const status = await manageJobs.getStatusForJob(draftTitle);
      record('draft job', /draft/i.test(status) ? 'created' : 'failed', `"${draftTitle}" → ${status || 'not listed'}`);
    }
  } catch (e) {
    record('employer jobs', 'failed', (e as Error).message.slice(0, 120));
  }

  // ════════════════ CANDIDATE: subscription + CVs ════════════════
  console.log('\n[2/8] Candidate subscription and CVs');
  let subscribed = false;
  try {
    const lp = new LoginPage(page);
    await lp.navigate();
    await lp.login(env.candidateEmail, env.candidatePassword);
    await page.waitForURL(/dashboard|jobs|home/i, { timeout: 60000 }).catch(() => {});

    await page.goto(`${site}/dashboard/subscription-history`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const text = await bodyText(page);
    const section = text.slice(text.indexOf('Active plan'), text.indexOf('Subscription History'));
    subscribed = /Jobrator|Plus|Premium|Basic/i.test(section);
    record(
      'active subscription',
      subscribed ? 'ok' : 'failed',
      subscribed ? section.slice(0, 60).trim() : 'run `npm run seed:subscription` (headed) first'
    );

    await page.goto(`${site}/dashboard/cv-manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4500);
    for (const [label, file] of [['Seed CV PDF', PDF_CV], ['Seed CV DOCX', DOCX_CV]] as const) {
      if ((await bodyText(page)).includes(label)) { record(`CV "${label}"`, 'ok'); continue; }
      const title = page.locator('input[placeholder="Enter Title"]').first();
      if (!(await title.isVisible().catch(() => false))) { record(`CV "${label}"`, 'failed', 'upload form not found'); continue; }
      await title.fill(label);
      await page.locator('input[type="file"]').first().setInputFiles(file);
      await page.waitForTimeout(1500);
      await page.locator('button:has-text("Submit")').first().click();
      await page.waitForTimeout(4500);
      const swal = await swalText(page);
      await dismissSwal(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
      record(`CV "${label}"`, (await bodyText(page)).includes(label) ? 'created' : 'failed', swal.slice(0, 60));
    }
  } catch (e) {
    record('candidate subscription/CVs', 'failed', (e as Error).message.slice(0, 120));
  }

  // ════════════════ CANDIDATE: application ════════════════
  console.log('\n[3/8] Candidate application');
  try {
    await page.goto(`${site}/dashboard/applied-jobs`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const existing = await page.locator('table tbody tr').count().catch(() => 0);
    if (existing > 0) {
      record('application', 'ok', `${existing} row(s) on Applied Jobs`);
    } else if (!subscribed) {
      record('application', 'skipped', 'candidate is not subscribed — applying is gated');
    } else {
      await page.goto(`${site}/jobs`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3500);
      let applied = false;
      const cards = Math.min(await page.locator('.job-block h4 a').count(), 4);
      for (let i = 0; i < cards && !applied; i++) {
        await page.goto(`${site}/jobs`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        await page.locator('.job-block h4 a').nth(i).click().catch(() => {});
        await page.waitForTimeout(4500);

        const apply = page.locator('a:has-text("Apply For Job"), button:has-text("Apply For Job")')
          .filter({ visible: true }).first();
        if (!(await apply.isVisible().catch(() => false))) continue;
        await apply.click().catch(() => {});
        await page.waitForTimeout(2500);

        const modal = page.locator('.modal:visible, [role="dialog"]:visible').first();
        if (!(await modal.isVisible().catch(() => false))) continue;

        // The CV picker is a custom dropdown, NOT a <select>. Submitting without
        // choosing a CV makes the apply POST return 500.
        const trigger = modal.locator('button:has-text("Select a CV"), [class*="select"]:has-text("Select a CV")')
          .filter({ visible: true }).first();
        if (await trigger.isVisible().catch(() => false)) {
          await trigger.click().catch(() => {});
          await page.waitForTimeout(1200);
          const option = page.locator('li:visible, [role="option"]:visible, .dropdown-item:visible, [class*="option"]:visible')
            .filter({ hasText: /CV|Resume|\.pdf|\.docx?/i }).first();
          if (await option.isVisible().catch(() => false)) {
            await option.click().catch(() => {});
            await page.waitForTimeout(900);
          }
        }
        await modal.locator('button', { hasText: /^Apply Job$/ }).first().click({ force: true }).catch(() => {});
        await page.waitForTimeout(5000);
        const swal = await swalText(page);
        await dismissSwal(page);

        await page.goto(`${site}/dashboard/applied-jobs`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);
        applied = (await page.locator('table tbody tr').count().catch(() => 0)) > 0;
        if (applied) record('application', 'created', swal.slice(0, 60));
      }
      if (!applied) record('application', 'failed', 'no job could be applied to');
    }
  } catch (e) {
    record('application', 'failed', (e as Error).message.slice(0, 120));
  }

  // ════════════════ CANDIDATE: conversation ════════════════
  console.log('\n[4/8] Candidate → employer conversation');
  try {
    await page.goto(`${site}/dashboard/messages`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4500);
    const threads = await page.locator('ul.contacts li').count().catch(() => 0);
    if (threads > 0) {
      record('conversation', 'ok', `${threads} thread(s)`);
    } else {
      // Conversations can only be started from the company page.
      await page.goto(`${site}/jobs`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await page.locator('.job-block h4 a').first().click().catch(() => {});
      await page.waitForTimeout(4000);
      const href = await page.locator('a[href*="/company/"]').first().getAttribute('href').catch(() => null);
      companyId = (href ?? '').split('/company/')[1] ?? '';
      if (!companyId) throw new Error('could not resolve the company id from a job detail page');

      await page.goto(`${site}/company/${companyId}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
      await page.locator('button:has-text("Private Message"), a:has-text("Private Message")')
        .filter({ visible: true }).first().click();
      await page.waitForTimeout(3000);
      const modal = page.locator('.modal.fade.show, .modal:visible').first();
      await modal.locator('textarea[name="message"], textarea:visible').first()
        .fill(`Hello, I applied for your role and would love to discuss it. Seeded ${new Date().toISOString()}`);
      await modal.locator('button:has-text("Send Message"), button:has-text("Send")').first().click({ force: true });
      await page.waitForTimeout(4500);
      const swal = await swalText(page);
      await dismissSwal(page);

      await page.goto(`${site}/dashboard/messages`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4500);
      const now = await page.locator('ul.contacts li').count().catch(() => 0);
      record('conversation', now > 0 ? 'created' : 'failed', swal.slice(0, 60));
    }
  } catch (e) {
    record('conversation', 'failed', (e as Error).message.slice(0, 120));
  }

  // ════════════════ EMPLOYER: shortlist, interview, reply ════════════════
  console.log('\n[5/8] Employer shortlist  [6/8] interview  [7/8] reply');
  try {
    const elp = new EmployerLoginPage(page);
    await elp.navigate();
    await elp.login(env.employerEmail, env.employerPassword);
    await page.waitForURL(/dashboard/i, { timeout: 60000 }).catch(() => {});

    // ── shortlist ──
    await page.goto(`${site}/dashboard/shortlisted-resumes`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    let shortlisted = (await page.locator('.candidate-block-three').count().catch(() => 0)) > 0;
    if (shortlisted) {
      record('shortlisted candidate', 'ok');
    } else {
      await page.goto(`${site}/dashboard/all-applicants`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4500);
      const btn = page.locator('[data-text="Shortlist Application"]').first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(2500);
        await dismissSwal(page);
        await page.waitForTimeout(2500);
        await page.goto(`${site}/dashboard/shortlisted-resumes`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        shortlisted = (await page.locator('.candidate-block-three').count().catch(() => 0)) > 0;
        record('shortlisted candidate', shortlisted ? 'created' : 'failed');
      } else {
        record('shortlisted candidate', 'failed', 'no Shortlist Application action (no applicants?)');
      }
    }

    // ── interview ──
    await page.goto(`${site}/dashboard/scheduled-interviews`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4500);
    if (/\d{2}-\d{2}-\d{4}/.test(await bodyText(page))) {
      record('scheduled interview', 'ok');
    } else if (!shortlisted) {
      record('scheduled interview', 'skipped', 'nothing shortlisted');
    } else {
      await page.goto(`${site}/dashboard/shortlisted-resumes`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);
      const sched = page.locator('[data-text="Schedule Interview"], [data-text="Reschedule Interview"]').first();
      if (await sched.isVisible().catch(() => false)) {
        await sched.click();
        await page.locator('.modal.fade.show').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(900);
        const modal = page.locator('.modal.fade.show').first();
        const future = new Date(Date.now() + 21 * 864e5);
        const pad = (n: number) => String(n).padStart(2, '0');
        await modal.locator('input[name="meetingLink"]').first().fill('https://meet.google.com/qa-seed-intv');
        await modal.locator('input[name="meetingDate"]').first()
          .fill(`${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}T10:30`);
        await modal.locator('input[name^="attendees"]').first().fill(env.candidateEmail);
        await modal.locator('button:has-text("Submit")').first().click();
        await page.waitForTimeout(5000);
        const swal = await swalText(page);
        await dismissSwal(page);
        record('scheduled interview', /success/i.test(swal) ? 'created' : 'failed', swal.slice(0, 60));
      } else {
        record('scheduled interview', 'failed', 'no Schedule Interview action');
      }
    }

    // ── employer reply ──
    await page.goto(`${site}/dashboard/messages`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const contact = page.locator('ul.contacts li').first();
    if (await contact.isVisible().catch(() => false)) {
      await contact.click();
      await page.waitForTimeout(4000);
      const composer = page.locator('textarea[name="message"]').filter({ visible: true }).first();
      if (await composer.isVisible().catch(() => false)) {
        // The chat widget has no Send button — Enter submits.
        await composer.fill(`Thanks for applying — shall we schedule a chat? Seeded ${new Date().toISOString()}`);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(4000);
        record('employer reply', 'created');
      } else {
        record('employer reply', 'failed', 'no composer in the open thread');
      }
    } else {
      record('employer reply', 'skipped', 'no thread to reply in');
    }
  } catch (e) {
    record('employer shortlist/interview/reply', 'failed', (e as Error).message.slice(0, 120));
  }

  // ════════════════ ADMIN: psychometric exam ════════════════
  console.log('\n[8/8] Admin psychometric exam');
  try {
    const alp = new AdminLoginPage(page);
    await alp.navigate();
    await alp.login(env.adminEmail, env.adminPassword);
    await page.waitForTimeout(7000);

    await page.goto(`${adminSite}/psychometric-test`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    if (/ID:\s*\d+/.test(await bodyText(page))) {
      record('psychometric exam', 'ok');
    } else {
      await page.locator('button:has-text("Create New Exam")').first().click();
      await page.waitForTimeout(4000);
      await page.locator('input[placeholder="e.g., Software Engineer Assessment"]').first()
        .fill(`QA Automation Psychometric Exam ${Date.now()}`);
      await page.locator('textarea[placeholder="Description (optional)"]').first()
        .fill('Seeded by the E2E suite so the edit-exam scenario has an exam to act on.');
      await page.locator('input[placeholder="Duration in minutes"]').first().fill('30');

      // Only a library that actually holds questions produces a usable exam.
      const select = page.locator('select.form-control').first();
      const options = await select.locator('option').evaluateAll((els: any[]) =>
        els.map((e) => ({ v: e.value, t: (e.textContent || '').trim() })));
      const withQuestions = options.find(
        (o) => o.v && Number(o.t.match(/\((\d+)\s+questions\)/)?.[1] ?? '0') > 0
      );
      if (withQuestions) await select.selectOption(withQuestions.v);

      await page.locator('button:has-text("Create Exam")').first().click();
      await page.waitForTimeout(5000);
      await page.goto(`${adminSite}/psychometric-test`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);
      record('psychometric exam', /ID:\s*\d+/.test(await bodyText(page)) ? 'created' : 'failed',
        withQuestions ? `library "${withQuestions.t}"` : 'no library with questions');
    }
  } catch (e) {
    record('psychometric exam', 'failed', (e as Error).message.slice(0, 120));
  }

  // ════════════════ Summary ════════════════
  const failed = results.filter((r) => r.status === 'failed');
  console.log('\n──────────── seed summary ────────────');
  for (const r of results) console.log(`  ${r.status.toUpperCase().padEnd(8)} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  console.log(`\n  ${results.length} stage(s): ${results.filter((r) => r.status !== 'failed').length} ok, ${failed.length} failed`);

  await browser.close();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('SEED FAILED', e); process.exit(1); });
