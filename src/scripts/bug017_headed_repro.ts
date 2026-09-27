/**
 * BUG-017 — Verbose auth-error oracle — HEADED CHROME reproduction.
 *
 * Why you "couldn't replicate it": the leak is NOT in the visible error message.
 * The UI shows a generic error; the internal exception code is only in the
 * `POST /api/login` JSON **response body**. This script captures that response
 * and paints it on top of the real Chrome window so you can see it, then pauses
 * on the reveal (REVEAL_DELAY_MS, default 12s) so you can read it clearly.
 *
 * Run:  npx ts-node src/scripts/bug017_headed_repro.ts
 * Tune: REVEAL_DELAY_MS=15000 npx ts-node src/scripts/bug017_headed_repro.ts
 */
import { chromium, Browser, Page, Response } from 'playwright';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const REVEAL_DELAY_MS = Number(process.env.REVEAL_DELAY_MS ?? 12000);
const SLOW_MO = Number(process.env.REPRO_SLOW_MO ?? 350);

interface Captured {
  status: number;
  statusText: string;
  body: string;
  url: string;
}

async function launchChrome(): Promise<Browser> {
  try {
    const b = await chromium.launch({ channel: 'chrome', headless: false, slowMo: SLOW_MO });
    console.log('Launched real Google Chrome.');
    return b;
  } catch {
    console.warn('Real Chrome not found — falling back to bundled Chromium (still headed).');
    return chromium.launch({ headless: false, slowMo: SLOW_MO });
  }
}

/** Small top banner announcing the current step. */
async function banner(page: Page, text: string, kind: 'info' | 'act' = 'info'): Promise<void> {
  await page.evaluate(({ text, kind }) => {
    document.getElementById('bug017-banner')?.remove();
    const bar = document.createElement('div');
    bar.id = 'bug017-banner';
    Object.assign(bar.style, {
      position: 'fixed', top: '0', left: '0', right: '0', zIndex: '2147483647',
      padding: '14px 20px', font: '600 16px/1.4 system-ui, sans-serif',
      color: '#fff', textAlign: 'center',
      background: kind === 'act' ? '#b45309' : '#1d4ed8',
      boxShadow: '0 4px 14px rgba(0,0,0,.35)',
    } as CSSStyleDeclaration);
    bar.textContent = text;
    document.body.appendChild(bar);
  }, { text, kind });
}

/** Full-screen reveal of the captured HTTP response, exception highlighted. */
async function reveal(page: Page, title: string, cap: Captured | null, uiError: string): Promise<void> {
  await page.evaluate(({ title, cap, uiError }) => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    document.getElementById('bug017-overlay')?.remove();
    const wrap = document.createElement('div');
    wrap.id = 'bug017-overlay';
    Object.assign(wrap.style, {
      position: 'fixed', inset: '0', zIndex: '2147483647',
      background: 'rgba(3,7,18,.86)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px',
      font: '14px/1.5 system-ui, sans-serif',
    } as CSSStyleDeclaration);

    const card = document.createElement('div');
    Object.assign(card.style, {
      background: '#0b1020', color: '#e5e7eb', width: '100%', maxWidth: '920px',
      maxHeight: '90vh', overflow: 'auto', borderRadius: '14px',
      border: '2px solid #ef4444', boxShadow: '0 24px 70px rgba(0,0,0,.65)',
      padding: '26px 30px',
    } as CSSStyleDeclaration);

    let bodyHtml = esc(cap ? cap.body : '(no response captured)');
    // Highlight the leaked exception field.
    bodyHtml = bodyHtml.replace(
      /(&quot;exception&quot;\s*:\s*&quot;[^&]*&quot;)/,
      '<mark style="background:#fde047;color:#111;padding:2px 5px;border-radius:4px;font-weight:700">$1</mark>',
    );

    card.innerHTML = `
      <div style="font:700 20px/1.3 system-ui;color:#f87171;margin-bottom:6px">🐞 BUG-017 — ${esc(title)}</div>
      <div style="color:#9ca3af;margin-bottom:18px">OWASP A07 · verbose auth-error oracle</div>

      <div style="margin-bottom:6px;color:#93c5fd;font-weight:700">1 · What the USER SEES (visible UI message)</div>
      <div style="background:#111827;border:1px solid #374151;border-radius:8px;padding:12px 14px;margin-bottom:20px">
        ${uiError ? '“' + esc(uiError) + '”' : '<i>generic error toast — nothing revealing</i>'}
        <div style="color:#6b7280;margin-top:6px;font-size:12px">← this is all you can see from the page. Looks harmless. This is why it seemed un-reproducible.</div>
      </div>

      <div style="margin-bottom:6px;color:#93c5fd;font-weight:700">2 · What the SERVER ACTUALLY RETURNS (network response body)</div>
      <div style="color:#9ca3af;margin-bottom:8px;font-size:13px">
        <b>HTTP ${cap ? cap.status + ' ' + esc(cap.statusText) : '—'}</b> &nbsp;·&nbsp; ${cap ? esc(cap.url) : ''}
      </div>
      <pre style="background:#020617;border:1px solid #334155;border-radius:8px;padding:14px 16px;white-space:pre-wrap;word-break:break-word;margin:0;font:13px/1.6 ui-monospace,Menlo,monospace">${bodyHtml}</pre>

      <div style="margin-top:18px;padding:12px 14px;background:#7f1d1d;border-radius:8px;color:#fecaca">
        The highlighted <code>exception</code> field leaks an internal error code and confirms the
        account exists &amp; only the password was wrong — an enumeration / credential-stuffing oracle.
        Expected: a generic body with <b>no</b> <code>exception</code> field.
      </div>
    `;
    wrap.appendChild(card);
    document.body.appendChild(wrap);
  }, { title, cap, uiError });
}

async function clearOverlays(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.getElementById('bug017-overlay')?.remove();
    document.getElementById('bug017-banner')?.remove();
  });
}

(async () => {
  const { LoginPage } = await import('../pages/LoginPage');
  const { EnvConfig } = await import('../config/env.config');
  const env = EnvConfig.getInstance();

  const email: string = env.candidateEmail;
  const wrongPassword = 'DefinitelyWrong@123';

  const browser = await launchChrome();
  const page: Page = await browser.newPage();

  let captured: Captured | null = null;
  page.on('response', async (res: Response) => {
    if (res.request().method() === 'POST' && /\/api\/login\b/.test(res.url())) {
      let body = '';
      try { body = await res.text(); } catch { body = '<unreadable>'; }
      captured = { status: res.status(), statusText: res.statusText(), body, url: res.url() };
    }
  });

  const waitForResponse = async () => {
    for (let i = 0; i < 25 && !captured; i++) await page.waitForTimeout(200);
  };

  const lp = new LoginPage(page);
  await lp.navigate();

  console.log(`\nBUG-017 headed repro — account: ${email}`);
  console.log(`Reveal pause: ${REVEAL_DELAY_MS} ms\n`);

  // ── Step 1: wrong password on a REAL account (the definitive leak) ─────────
  await banner(page, 'STEP 1 — Submitting a WRONG password for a REAL, registered account…', 'act');
  await page.waitForTimeout(1800);

  captured = null;
  await lp.login(email, wrongPassword);
  await waitForResponse();
  await page.waitForTimeout(1200);
  const uiError = (await lp.getErrorMessage()).trim().replace(/\s+/g, ' ');

  console.log('Captured response:', captured ? `${(captured as Captured).status} ${(captured as Captured).body}` : '(none)');

  await banner(page, '⏸  FAILING STEP — read the highlighted “exception” field below', 'act');
  await reveal(page, 'Login response leaks the internal failure reason', captured, uiError);
  console.log(`Holding the reveal on screen for ${REVEAL_DELAY_MS} ms…`);
  await page.waitForTimeout(REVEAL_DELAY_MS);

  await page.screenshot({ path: path.resolve(process.cwd(), 'reports/bug017_repro_reveal.png'), fullPage: true });

  // ── Step 2: unregistered email — compare the responses ─────────────────────
  await clearOverlays(page);
  const ghost = `no.such.user.${Date.now()}@example-nonexistent.io`;
  await banner(page, 'STEP 2 — Same request with an UNREGISTERED email — compare the response…', 'act');
  await page.waitForTimeout(1800);

  captured = null;
  await lp.login(ghost, wrongPassword);
  await waitForResponse();
  await page.waitForTimeout(1200);
  const ghostUiError = (await lp.getErrorMessage()).trim().replace(/\s+/g, ' ');

  console.log('Unregistered response:', captured ? `${(captured as Captured).status} ${(captured as Captured).body}` : '(none)');

  await banner(page, '⏸  Compare this response to Step 1 — do they reveal which email exists?', 'act');
  await reveal(page, 'Unregistered-email response (compare with Step 1)', captured, ghostUiError);
  await page.waitForTimeout(Math.max(8000, REVEAL_DELAY_MS - 3000));

  await page.screenshot({ path: path.resolve(process.cwd(), 'reports/bug017_repro_compare.png'), fullPage: true });

  console.log('\nDone — closing the window in 4s. Screenshots saved to reports/bug017_repro_*.png');
  await page.waitForTimeout(4000);
  await browser.close();
})().catch(async (err) => {
  console.error('\nRepro failed:', err);
  process.exit(1);
});
