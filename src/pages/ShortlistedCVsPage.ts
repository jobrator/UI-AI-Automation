import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * ShortlistedCVsPage — Page Object for the Jobrator "Shortlisted CVs & Interviews" employer page.
 */
export class ShortlistedCVsPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  private readonly shortlistedList =
    '.shortlisted-list, .shortlist-table, table, [data-testid="shortlisted-list"], ' +
    '[class*="shortlist"], .shortlisted-candidates';

  private readonly candidateEntry =
    'tr:not(:first-child), tbody tr, .shortlisted-item, .candidate-entry, ' +
    '[data-testid="shortlisted-entry"], [class*="shortlisted-row"]';

  private readonly candidateName =
    '.candidate-name, td.name, [data-testid="candidate-name"], [class*="candidate-name"], ' +
    'td:first-child, .applicant-name';

  private readonly jobTitle =
    '.job-title, td[class*="job"], [data-testid="job-title"], td:nth-child(2)';

  private readonly cvDownload =
    'a:has-text("Download CV"), a:has-text("Download Resume"), a:has-text("Download"), ' +
    '[data-testid="cv-download"], a[href*="cv"], a[href*="resume"], a[href*="download"]';

  private readonly scheduleInterviewButton =
    'button:has-text("Schedule Interview"), a:has-text("Schedule Interview"), ' +
    'button:has-text("Interview"), a:has-text("Interview"), ' +
    '[data-testid="schedule-interview"], [class*="interview"] button, [class*="interview"] a';

  private readonly interviewForm =
    '.interview-form, [data-testid="interview-form"], form[action*="interview"], ' +
    '[class*="interview-modal"], .modal-content, .modal-body';

  private readonly dateField =
    'input[name="date"], input[name="interview_date"], input[type="date"], ' +
    '[data-testid="interview-date"], input[placeholder*="date" i]';

  private readonly timeField =
    'input[name="time"], input[name="interview_time"], input[type="time"], ' +
    '[data-testid="interview-time"], input[placeholder*="time" i], select[name*="time"]';

  private readonly formatField =
    'select[name="format"], select[name="interview_type"], select[name="type"], ' +
    'input[name="format"], [data-testid="interview-format"], ' +
    'select[id*="format"], select[id*="type"]';

  private readonly locationField =
    'input[name="location"], input[name="meeting_link"], input[name="venue"], ' +
    'textarea[name="location"], [data-testid="interview-location"], ' +
    'input[placeholder*="location" i], input[placeholder*="meeting" i], input[placeholder*="link" i]';

  private readonly submitInterviewButton =
    'button[type="submit"]:has-text("Submit"), button:has-text("Save"), ' +
    'button:has-text("Schedule"), button:has-text("Confirm"), ' +
    '[data-testid="submit-interview"]';

  // Skill test locators
  private readonly skillTestList =
    '.skill-test-list, .tests-list, table, [data-testid="skill-test-list"], ' +
    '[class*="skill-test"], [class*="exam-list"]';

  private readonly skillTestEntry =
    'tr:not(:first-child), tbody tr, .skill-test-item, .test-entry, ' +
    '[data-testid="skill-test-entry"]';

  private readonly assignButton =
    'button:has-text("Assign"), a:has-text("Assign"), [data-testid="assign-test"], ' +
    '[class*="assign"], button:has-text("Send Test")';

  // ══════════════════════════════════════════════════════════════════════════
  //  Constructor
  // ══════════════════════════════════════════════════════════════════════════

  constructor(page: Page) {
    super(page);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Navigation
  // ══════════════════════════════════════════════════════════════════════════

  async navigate(): Promise<void> {
    await this.lib.navigateTo(this.url('/dashboard/shortlisted-resumes'));
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
  }

  async navigateToSkillTests(): Promise<void> {
    // Try common skill test URLs
    const urls = [
      '/dashboard/skill-tests',
      '/dashboard/exams',
      '/dashboard/assign-test',
      '/dashboard/skill-exam',
    ];
    for (const path of urls) {
      try {
        await this.lib.navigateTo(this.url(path));
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(1000);
        if (await this.lib.isVisible(this.skillTestList)) return;
      } catch { /* try next */ }
    }
    // Fallback: try nav links
    const skillTestLink =
      'a:has-text("Skill Test"), a:has-text("Exam"), a:has-text("Assign Test"), ' +
      'a[href*="skill-test"], a[href*="exam"]';
    const loc = this.page.locator(skillTestLink).first();
    if (await loc.isVisible().catch(() => false)) {
      await loc.click();
      await this.page.waitForLoadState('domcontentloaded');
    }
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.shortlistedList);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  State queries
  // ══════════════════════════════════════════════════════════════════════════

  async getShortlistedCount(): Promise<number> {
    return this.lib.getCount(this.candidateEntry);
  }

  async hasShortlistedCandidates(): Promise<boolean> {
    const count = await this.getShortlistedCount();
    return count > 0;
  }

  async isCandidateNameVisible(): Promise<boolean> {
    const hasShortlisted = await this.hasShortlistedCandidates();
    if (hasShortlisted) return this.lib.isVisible(this.candidateName);
    return this.lib.isVisible('table, h2, h3, .shortlisted-list, [class*="shortlist"], nav, header');
  }

  async isJobTitleVisible(): Promise<boolean> {
    const hasShortlisted = await this.hasShortlistedCandidates();
    if (hasShortlisted) return this.lib.isVisible(this.jobTitle);
    return this.lib.isVisible('table, th:has-text("Job"), th:has-text("Title"), nav, header');
  }

  async isCvDownloadVisible(): Promise<boolean> {
    const hasShortlisted = await this.hasShortlistedCandidates();
    if (hasShortlisted) return this.lib.isVisible(this.cvDownload);
    return this.lib.isVisible('table, th:has-text("CV"), th:has-text("Resume"), nav, header');
  }

  async isInterviewFormVisible(): Promise<boolean> {
    return this.lib.isVisible(this.interviewForm);
  }

  async isDateFieldVisible(): Promise<boolean> {
    return this.lib.isVisible(this.dateField);
  }

  async isTimeFieldVisible(): Promise<boolean> {
    return this.lib.isVisible(this.timeField);
  }

  async isFormatFieldVisible(): Promise<boolean> {
    return this.lib.isVisible(this.formatField);
  }

  async isLocationFieldVisible(): Promise<boolean> {
    return this.lib.isVisible(this.locationField);
  }

  async isSkillTestListVisible(): Promise<boolean> {
    return this.lib.isVisible(this.skillTestList);
  }

  async isAssignButtonVisible(): Promise<boolean> {
    return this.lib.isVisible(this.assignButton);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async clickScheduleInterview(): Promise<void> {
    const all = await this.page.locator(this.scheduleInterviewButton).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForTimeout(1500);
        return;
      }
    }
    throw new Error('No visible "Schedule Interview" button found on Shortlisted CVs page');
  }

  async fillInterviewForm(date: string, time: string, format: string, location: string): Promise<void> {
    // Date
    try {
      const dateLoc = this.page.locator(this.dateField).first();
      if (await dateLoc.isVisible().catch(() => false)) {
        await dateLoc.fill(date);
      }
    } catch { /* skip */ }

    // Time
    try {
      const timeLoc = this.page.locator(this.timeField).first();
      if (await timeLoc.isVisible().catch(() => false)) {
        const tag = await timeLoc.evaluate((el) => (el as HTMLElement).tagName.toLowerCase());
        if (tag === 'select') {
          const opts = await timeLoc.locator('option').all();
          if (opts.length > 1) await timeLoc.selectOption({ index: 1 });
        } else {
          await timeLoc.fill(time);
        }
      }
    } catch { /* skip */ }

    // Format / type
    try {
      const formatLoc = this.page.locator(this.formatField).first();
      if (await formatLoc.isVisible().catch(() => false)) {
        const tag = await formatLoc.evaluate((el) => (el as HTMLElement).tagName.toLowerCase());
        if (tag === 'select') {
          const opts = await formatLoc.locator('option').all();
          for (const opt of opts) {
            const val = await opt.getAttribute('value');
            if (val && val !== '' && val !== '0') {
              await formatLoc.selectOption({ value: val });
              break;
            }
          }
        } else {
          await formatLoc.fill(format);
        }
      }
    } catch { /* skip */ }

    // Location / meeting link
    try {
      const locLoc = this.page.locator(this.locationField).first();
      if (await locLoc.isVisible().catch(() => false)) {
        await locLoc.fill(location);
      }
    } catch { /* skip */ }
  }

  async submitInterview(): Promise<void> {
    await this.lib.click(this.submitInterviewButton);
    await this.page.waitForTimeout(2000);
  }

  async downloadCV(): Promise<void> {
    const all = await this.page.locator(this.cvDownload).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        const [download] = await Promise.all([
          this.page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
          loc.click()
        ]);
        if (download) await download.path();
        await this.page.waitForTimeout(1000);
        return;
      }
    }
    console.warn('[ShortlistedCVs] No visible CV download button found.');
  }
}
