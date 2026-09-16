/**
 * sprint54_applied_jobs.ts — dumps the candidate's Applied Jobs rows and the
 * underlying API records so ADO #29064 (skill test still available after the
 * job posting / test window expires) can be judged on real data.
 */
import { chromium } from 'playwright';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

(async () => {
  const { LoginPage } = await import('../pages/LoginPage');
  const { EnvConfig } = await import('../config/env.config');
  const env = EnvConfig.getInstance();
  const site = env.jobratorSite.replace(/\/$/, '');

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();

  const payloads: any[] = [];
  page.on('response', async (r) => {
    if (!/applied|application/i.test(r.url()) || !/api\.jobrator/.test(r.url())) return;
    try {
      payloads.push({ url: r.url(), body: await r.json() });
    } catch {
      /* non-JSON */
    }
  });

  const lp = new LoginPage(page);
  await lp.navigate();
  await lp.login(env.candidateEmail, env.candidatePassword);
  await page.waitForURL(/dashboard|jobs|home/i, { timeout: 60000 }).catch(() => {});

  await page.goto(`${site}/dashboard/applied-jobs`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  const rows = await page.locator('table tbody tr').all();
  console.log(`\nApplied Jobs rows: ${rows.length}\n`);
  for (const [i, row] of rows.entries()) {
    const text = ((await row.textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
    const buttons = await row.locator('button, a').allTextContents().catch(() => []);
    console.log(`  [${i}] ${text.slice(0, 200)}`);
    console.log(`       controls: ${buttons.map((b) => b.trim()).filter(Boolean).join(' | ') || 'none'}`);
  }

  console.log('\n── API records ──');
  for (const p of payloads) {
    console.log(`  ${p.url}`);
    const arr = p.body?.data ?? (Array.isArray(p.body) ? p.body : []);
    if (Array.isArray(arr)) {
      for (const a of arr.slice(0, 10)) {
        console.log(
          `    job="${a?.job_post?.title ?? a?.title ?? '?'}" ` +
            `expiry="${a?.job_post?.expiry_date ?? a?.expiry_date ?? '?'}" ` +
            `status="${a?.status ?? '?'}" ` +
            `test="${JSON.stringify(a?.skill_test ?? a?.exam ?? null).slice(0, 80)}"`,
        );
      }
    }
  }

  await page.screenshot({ path: 'reports/sprint54/29064-applied-jobs-detail.png', fullPage: true }).catch(() => {});
  await browser.close();
})();
