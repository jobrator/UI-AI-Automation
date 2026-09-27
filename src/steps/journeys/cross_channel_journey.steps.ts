/**
 * cross_channel_journey.steps.ts
 *
 * Step definitions for features/journeys/cross_channel_journey.feature — the web
 * counterparts of the mobile integration journeys (Mobile Integration Test Plan, 26 Sep 2026):
 *
 *   WEB-E2E-06  a skill exam from the job to the score
 *   WEB-E2E-08  a candidate's profile changes reach the employer
 *   WEB-E2E-14  a deleted candidate leaves the employer's side intact
 *
 * Fixtures are seeded through the Jobrator API rather than the UI, for the same reason the
 * mobile journeys do it: what is being tested is the seam between the two sides, not the form
 * that writes the job. Job creation is multipart and unvalidated — a missing field answers
 * HTTP 500 without naming it — so every field the web client sends is sent here too.
 *
 * Each scenario registers its own throwaway candidate. An exam allows one attempt per job and
 * deleting a profile cannot be undone; neither may touch the shared account the rest of the
 * suite signs in with.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();
const API = 'https://api.jobrator.com/api';
const PASSWORD = 'JobratorTest#1';

/** "PHP for Freshers" — an exam template on the shared employer; attaching it clones a new exam onto the job. */
const SKILL_EXAM_TEMPLATE_ID = 1;

interface Throwaway {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  candidateId: number;
  token: string;
}

interface JourneyState {
  runTag: string;
  employerToken: string;
  jobId: number;
  jobTitle: string;
  candidate: Throwaway;
  webScore?: string;
  summary?: string;
}

/** Scenario state, hung off the world so the After hook can clean up. */
function state(world: CustomWorld): JourneyState {
  const holder = world as unknown as { crossChannel?: JourneyState };
  if (!holder.crossChannel) throw new Error('No cross-channel journey was seeded in this scenario.');
  return holder.crossChannel;
}

function site(path: string): string {
  return `${envConfig.jobratorSite.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

async function api(
  method: string,
  path: string,
  options: { token?: string; json?: unknown; form?: FormData } = {}
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.json) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: options.json ? JSON.stringify(options.json) : (options.form as any),
  });
  const text = await res.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch { /* non-JSON error page */ }
  return { status: res.status, body };
}

async function apiLogin(email: string, password: string, profile: 'Candidate' | 'Company'): Promise<string> {
  const { status, body } = await api('POST', '/login', { json: { email, password, profile, loginMethod: 'email' } });
  if (status !== 200) throw new Error(`${profile} API sign-in failed for ${email}: ${status} ${JSON.stringify(body)}`);
  return body.token;
}

/** A minimal one-page PDF, so a seeded candidate can apply without a fixture file on disk. */
function cvPdf(heading: string): Buffer {
  const content = Buffer.from(`BT /F1 16 Tf 60 740 Td (${heading.replace(/[()\\]/g, '')}) Tj ET`);
  const objects = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>'),
    Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`), content, Buffer.from('\nendstream')]),
    Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),
  ];
  let out = Buffer.from('%PDF-1.4\n');
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(out.length);
    out = Buffer.concat([out, Buffer.from(`${index + 1} 0 obj\n`), object, Buffer.from('\nendobj\n')]);
  });
  const xref = out.length;
  out = Buffer.concat([
    out,
    Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`),
    Buffer.from(offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')),
    Buffer.from(`trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`),
  ]);
  return out;
}

async function seedJob(token: string, title: string, withExam: boolean): Promise<number> {
  const today = new Date();
  const closing = new Date(today.getTime() + 30 * 864e5);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const form = new FormData();
  const fields: [string, string][] = [
    ['title', title],
    ['description', `${title} - cross-channel integration fixture.`],
    ['location', 'London, United Kingdom'],
    ['companyInformation', 'Jobrator QA automation test company.'],
    ['responsibilitiesAndDuties', 'Automate regression tests for the Jobrator apps.'],
    ['salary', '$35000 - $60000'],
    ['benefits', 'Flexible hours and remote working.'],
    ['contactInformation', 'qa.automation@mailinator.com'],
    ['companyBranding', 'Jobrator QA - building reliable hiring software.'],
    ['isDraft', 'false'],
    ['openingDate', iso(today)],
    ['closingDate', iso(closing)],
    ['employmentType[]', '1'],
    ['workMode[]', '1'],
    ['skillIds[]', '1'],
    ['qualificationIds[]', '3'],
  ];
  if (withExam) fields.push(['skillExamIds[]', String(SKILL_EXAM_TEMPLATE_ID)]);
  for (const [name, value] of fields) form.append(name, value);

  const { status, body } = await api('POST', '/account/job-posts', { token, form });
  if (status !== 200) throw new Error(`Seeding the job '${title}' failed: ${status} ${JSON.stringify(body)}`);
  if (withExam && (body.data.skillExams ?? []).length === 0) {
    throw new Error(`The seeded job '${title}' carries no skill exam.`);
  }
  return body.data.id;
}

async function registerThrowaway(runTag: string, lastName: string): Promise<Throwaway> {
  const email = `${runTag.toLowerCase()}-${lastName.toLowerCase()}@mailinator.com`;
  const { status, body } = await api('POST', '/register-candidate', {
    json: { firstName: 'Web', lastName, email, password: PASSWORD, loginMethod: 'email' },
  });
  if (status !== 201) throw new Error(`Registering ${email} failed: ${status} ${JSON.stringify(body)}`);
  const token = await apiLogin(email, PASSWORD, 'Candidate');
  const form = new FormData();
  form.append('documentTypeId', '1');
  form.append('title', `${runTag}-${lastName}.pdf`);
  form.append('uploadableFile', new Blob([cvPdf(`${runTag} ${lastName}`)], { type: 'application/pdf' }), `${runTag}-${lastName}.pdf`);
  const upload = await api('POST', '/account/documents', { token, form });
  if (upload.status !== 200) throw new Error(`Uploading a CV for ${email} failed: ${upload.status}`);
  return { email, password: PASSWORD, firstName: 'Web', lastName, candidateId: body.data.candidate.id, token };
}

async function loginOnWeb(world: CustomWorld, email: string, password: string, role: 'Candidate' | 'Employer'): Promise<void> {
  await world.context.clearCookies();
  await world.page.goto(site('/login'), { waitUntil: 'domcontentloaded', timeout: envConfig.navigationTimeout });
  const tab = world.page.locator(`button:has-text("${role}")`).first();
  if (await tab.isVisible().catch(() => false)) {
    await tab.click();
    await world.page.waitForTimeout(500);
  }
  await world.page.locator('input[name="email"], input[type="email"]').first().fill(email);
  await world.page.locator('input[type="password"]').first().fill(password);
  await world.page.evaluate(() => {
    const cb = document.querySelector('input[name="checkbox-ready"]') as HTMLInputElement | null;
    if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await world.page.locator('button[type="submit"]').first().click();
  await world.page.waitForURL(/dashboard|jobs|home|profile/i, { timeout: envConfig.navigationTimeout });
  world.logMessage(`[cross-channel] signed in on the web as ${role} ${email}`);
}

// ─── Seeding ────────────────────────────────────────────────────────────────

Given('a seeded job with a skill exam and a throwaway candidate with a CV', async function (this: CustomWorld) {
  await seedJourney(this, true, 'Examinee');
});

Given('a seeded job with a throwaway candidate who has applied on the web', async function (this: CustomWorld) {
  await seedJourney(this, false, 'Profiled');
  await loginOnWeb(this, state(this).candidate.email, PASSWORD, 'Candidate');
  await applyOnWeb(this);
});

async function seedJourney(world: CustomWorld, withExam: boolean, label: string): Promise<void> {
  const runTag = `WINT-${new Date().toISOString().slice(5, 16).replace(/[-T:]/g, '')}`;
  const employerToken = await apiLogin(envConfig.employerEmail, envConfig.employerPassword, 'Company');
  const jobTitle = `${runTag} ${withExam ? 'Exam' : 'Profile'} Job`;
  const jobId = await seedJob(employerToken, jobTitle, withExam);
  const candidate = await registerThrowaway(runTag, label);
  (world as unknown as { crossChannel: JourneyState }).crossChannel = {
    runTag, employerToken, jobId, jobTitle, candidate,
  };
  // Printed so a run that dies mid-journey can still be traced back to its fixtures.
  world.logMessage(`[cross-channel] seeded job ${jobId} "${jobTitle}" and candidate ${candidate.email} / ${PASSWORD}`);
}

Then('starting the skill exam before applying should be refused by the API', async function (this: CustomWorld) {
  const s = state(this);
  const job = await api('GET', `/job-posts-id/${s.jobId}`);
  const exams = (job.body.data ?? job.body).skillExams ?? [];
  expect(exams.length, 'the seeded job carries no skill exam').toBeGreaterThan(0);
  const attempt = await api('POST', '/account/skill-exams/start', {
    token: s.candidate.token, json: { skillExamId: exams[0].id },
  });
  expect(attempt.status, `starting the exam before applying answered ${attempt.status}`).toBe(403);
});

// ─── Candidate on the web ───────────────────────────────────────────────────

When('the throwaway candidate logs in to the web app', async function (this: CustomWorld) {
  await loginOnWeb(this, state(this).candidate.email, PASSWORD, 'Candidate');
});

When('the candidate applies for the seeded job on the web', async function (this: CustomWorld) {
  await applyOnWeb(this);
});

async function applyOnWeb(world: CustomWorld): Promise<void> {
  const s = state(world);
  const page = world.page;
  await page.goto(site(`/jobs/${s.jobId}`), { waitUntil: 'domcontentloaded', timeout: envConfig.navigationTimeout });
  await page.waitForTimeout(3000);
  const apply = page.locator('button:has-text("Apply"), a:has-text("Apply")').first();
  await apply.click();
  await page.waitForTimeout(3000);
  // The apply dialog asks which saved CV to use; the seeded candidate has exactly one.
  const confirm = page.locator('button:has-text("Apply"), button[type="submit"]').last();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
    await page.waitForTimeout(4000);
  }
  const applied = await api('GET', '/account/job-posts/applied/', { token: s.candidate.token });
  const ids = ((applied.body.data ?? []) as any[]).map(j => j.id);
  expect(ids, `${s.candidate.email} is not recorded as having applied for job ${s.jobId}`).toContain(s.jobId);
  world.logMessage(`[cross-channel] ${s.candidate.email} applied for job ${s.jobId}`);
}

Then("the seeded job should be listed on the candidate's applied jobs page", async function (this: CustomWorld) {
  const s = state(this);
  await this.page.goto(site('/dashboard/applied-jobs'), { waitUntil: 'domcontentloaded', timeout: envConfig.navigationTimeout });
  await this.page.waitForTimeout(4000);
  await expect(this.page.locator(`text=${s.jobTitle}`).first()).toBeVisible({ timeout: 20000 });
  // Worth knowing: the web labels a new application "Applied" where mobile shows "Pending".
  const row = (await this.page.locator('body').innerText()).split('\n').find(line => line.includes(s.jobTitle)) ?? '';
  this.logMessage(`[cross-channel] applied-jobs row: ${row.trim()}`);
});

Then('a skill test notification for the seeded job should be on the candidate dashboard', async function (this: CustomWorld) {
  const s = state(this);
  // The record itself is the contract; the dashboard renders it from the same route.
  let messages: string[] = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    const notifications = await api('GET', '/account/candidate-notifications/', { token: s.candidate.token });
    const rows = (notifications.body.data ?? []) as any[];
    messages = rows.map(n => `${n.message}(${n.jobId})`);
    if (rows.some(n => n.jobId === s.jobId && /skill/i.test(n.message ?? ''))) break;
    await this.page.waitForTimeout(5000);
  }
  expect(messages.join(' | '), `no skill-test notification for job ${s.jobId}`).toMatch(/skill/i);

  await this.page.goto(site('/dashboard'), { waitUntil: 'domcontentloaded', timeout: envConfig.navigationTimeout });
  await this.page.waitForTimeout(4000);
  const dashboard = await this.page.locator('body').innerText();
  expect(dashboard, 'the dashboard shows no skill-test notification for the seeded job')
    .toMatch(new RegExp(`skill test[\\s\\S]{0,120}${s.jobTitle.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`, 'i'));
});

When('the candidate takes the attached skill test', async function (this: CustomWorld) {
  const s = state(this);
  const page = this.page;
  await page.goto(site('/dashboard/job-attached-skill-test'), { waitUntil: 'domcontentloaded', timeout: envConfig.navigationTimeout });
  await page.waitForTimeout(4000);
  await expect(page.locator(`text=Job: ${s.jobTitle}`).first()).toBeVisible({ timeout: 20000 });

  await page.locator('button:has-text("Take Test"), button:has-text("Start"), button:has-text("Click to Take Test")').first().click();
  await page.waitForTimeout(4000);
  // A rules screen with a readiness checkbox stands between the list and the questions.
  const ready = page.locator('input[type="checkbox"]').first();
  if (await ready.isVisible().catch(() => false)) await ready.check().catch(() => undefined);
  const start = page.locator('button:has-text("Start Test")').first();
  if (await start.isVisible().catch(() => false)) {
    await start.click();
    await page.waitForTimeout(4000);
  }

  // Answer every question with its first option. Which answers are right is not what this
  // journey tests - the score arriving intact on the other side is.
  for (let question = 0; question < 30; question += 1) {
    const option = page.locator('input[type="radio"], label:has(input[type="radio"])').first();
    if (await option.isVisible().catch(() => false)) await option.click().catch(() => undefined);
    const submit = page.locator('button:has-text("Submit")').first();
    const next = page.locator('button:has-text("Next")').first();
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
      break;
    }
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(6000);
  const shown = await page.locator('body').innerText();
  const score = shown.match(/(\d+(?:\.\d+)?)\s*%/);
  expect(score, 'no score is shown after submitting the exam').not.toBeNull();
  s.webScore = score![1];
  this.logMessage(`[cross-channel] the web shows a score of ${s.webScore}%`);
});

Then('the score shown on the web should match the score the API recorded', async function (this: CustomWorld) {
  const s = state(this);
  const results = await api('GET', `/account/skill-exams/results/my-results/${s.candidate.candidateId}?page=1&limit=50`, { token: s.candidate.token });
  const row = ((results.body.data ?? []) as any[]).find(r => r.jobPostId === s.jobId);
  expect(row, `the API holds no exam result for job ${s.jobId}`).toBeDefined();
  const [correct, total] = String(row.score).split('/').map((part: string) => Number(part.trim()));
  const expected = total === 0 ? 0 : Math.round((1000 * correct) / total) / 10;
  expect(Number(s.webScore), `the web showed ${s.webScore}% and the API holds ${row.score}`).toBeCloseTo(expected, 1);
});

Then('the attached skill test should then be refused as already taken', async function (this: CustomWorld) {
  await this.page.goto(site('/dashboard/job-attached-skill-test'), { waitUntil: 'domcontentloaded', timeout: envConfig.navigationTimeout });
  await this.page.waitForTimeout(4000);
  await expect(this.page.locator('button:has-text("Exam Already Taken"), text=Exam Already Taken').first())
    .toBeVisible({ timeout: 20000 });
});

// ─── Profile ────────────────────────────────────────────────────────────────

When('the candidate saves a career summary carrying the run tag', async function (this: CustomWorld) {
  const s = state(this);
  s.summary = `${s.runTag} integration summary - written by the web automation suite.`;
  // The summary is a DraftJS contenteditable, and the profile form refuses to save while a
  // required field is empty, so the API is used to write it and the UI to read it back.
  const update = await api('PUT', '/account/candidate', {
    token: s.candidate.token,
    json: { firstName: s.candidate.firstName, lastName: s.candidate.lastName, summary: s.summary },
  });
  expect(update.status, `saving the summary failed: ${JSON.stringify(update.body)}`).toBeLessThan(400);
});

Then("the saved summary should be on the candidate's own profile page", async function (this: CustomWorld) {
  const s = state(this);
  await this.page.goto(site(`/candidate/${s.candidate.candidateId}`), { waitUntil: 'domcontentloaded', timeout: envConfig.navigationTimeout });
  await this.page.waitForTimeout(4000);
  expect(await this.page.locator('body').innerText(), 'the candidate page does not show the saved summary')
    .toContain(s.runTag);
});

When('the employer opens the candidate page of the throwaway candidate', async function (this: CustomWorld) {
  const s = state(this);
  await this.page.goto(site(`/candidate/${s.candidate.candidateId}`), { waitUntil: 'domcontentloaded', timeout: envConfig.navigationTimeout });
  await this.page.waitForTimeout(4000);
});

Then('the candidate page should show the summary the candidate saved', async function (this: CustomWorld) {
  const s = state(this);
  expect(await this.page.locator('body').innerText(),
    "the employer's view of the candidate does not show the summary the candidate saved").toContain(s.runTag);
});

Then('the candidate page should show the location as place names and not as ids', async function (this: CustomWorld) {
  // ADO-29391 on mobile: a saved location read back as the ids behind it ("..., 1026, 77").
  const text = await this.page.locator('body').innerText();
  const numericLocation = text.split('\n')
    .filter(line => /location|address|city|state|country/i.test(line))
    .flatMap(line => line.split(/[,|]/))
    .map(part => part.trim())
    .filter(part => /^\d{3,6}$/.test(part));
  expect(numericLocation, `the candidate page renders location ids: ${numericLocation.join(', ')}`).toHaveLength(0);
});

// ─── Account lifecycle ──────────────────────────────────────────────────────

When('the candidate deletes their profile from the web profile page', async function (this: CustomWorld) {
  const s = state(this);
  const page = this.page;
  await page.goto(site('/dashboard/profile'), { waitUntil: 'domcontentloaded', timeout: envConfig.navigationTimeout });
  await page.waitForTimeout(4000);
  await page.locator('button:has-text("Delete Profile"), button:has-text("Delete Account")').first().click();
  await page.waitForTimeout(2000);
  const confirm = page.locator('button:has-text("Yes"), button:has-text("Confirm"), button:has-text("Delete")').last();
  await confirm.click();
  await page.waitForTimeout(6000);
  this.logMessage(`[cross-channel] deleted ${s.candidate.email} from the web profile page`);
});

Then('the deleted account should no longer be able to sign in through the API', async function (this: CustomWorld) {
  const s = state(this);
  const attempt = await api('POST', '/login', {
    json: { email: s.candidate.email, password: PASSWORD, profile: 'Candidate', loginMethod: 'email' },
  });
  expect(attempt.status, `${s.candidate.email} can still sign in after the profile was deleted`).not.toBe(200);
});

// ─── Employer side ──────────────────────────────────────────────────────────

When('the employer logs in and opens the applicants for the seeded job', async function (this: CustomWorld) {
  const s = state(this);
  await loginOnWeb(this, envConfig.employerEmail, envConfig.employerPassword, 'Employer');
  await this.page.goto(site('/dashboard/all-applicants'), { waitUntil: 'domcontentloaded', timeout: envConfig.navigationTimeout });
  await this.page.waitForTimeout(5000);
  this.logMessage(`[cross-channel] employer opened the applicants page for job ${s.jobId}`);
});

Then('the employer should see the same skill test score for the candidate', async function (this: CustomWorld) {
  const s = state(this);
  const text = await this.page.locator('body').innerText();
  expect(text, `the applicant list does not mention ${s.candidate.firstName} ${s.candidate.lastName}`)
    .toContain(s.candidate.lastName);
  const percentages = [...text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m => m[1]);
  expect(percentages, "the employer's applicant list shows no exam score at all").not.toHaveLength(0);
  expect(percentages.map(Number), `the candidate scored ${s.webScore}% and the employer sees ${percentages.join(', ')}%`)
    .toContainEqual(Number(s.webScore));
});

Then('the applicant list should load without an error', async function (this: CustomWorld) {
  const text = await this.page.locator('body').innerText();
  expect(text, 'the applicants page rendered an error after the candidate was deleted')
    .not.toMatch(/something went wrong|application error|500|unhandled/i);
});

Then('no applicant row should be left without a candidate name', async function (this: CustomWorld) {
  const s = state(this);
  const text = await this.page.locator('body').innerText();
  // Either behaviour is defensible and the PO has not ruled: the applicant may vanish or be
  // marked as deleted. What must not happen is a row with a status and no name.
  this.logMessage(`[cross-channel] after deletion the applicant list ${text.includes(s.candidate.lastName) ? 'still lists' : 'no longer lists'} the candidate`);
  expect(text, 'an applicant row is left without a candidate name').not.toMatch(/(^|\n)\s*(Pending|Shortlisted|Selected|Rejected)\s*(\n|$)/);
});
