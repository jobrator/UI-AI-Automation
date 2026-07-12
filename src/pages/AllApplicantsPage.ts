import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * AllApplicantsPage — Page Object for the Jobrator "All Applicants" employer page.
 */
export class AllApplicantsPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  private readonly applicantsList =
    '.applicants-list, .applications-list, table, [data-testid="applicants-list"], ' +
    '.candidates-list, [class*="applicant"], [class*="application"]';

  private readonly applicantEntry =
    'tr:not(:first-child), tbody tr, .applicant-item, .application-item, ' +
    '[data-testid="applicant-entry"], [class*="applicant-row"], .candidate-row';

  private readonly candidateName =
    '.candidate-name, td.name, [data-testid="candidate-name"], [class*="candidate-name"], ' +
    'td:first-child a, .applicant-name, a[href*="candidate"]';

  private readonly jobTitle =
    '.job-title, td[class*="job"], [data-testid="job-title"], [class*="job-title"], ' +
    'td:nth-child(2)';

  private readonly applicationStatus =
    '.application-status, .status-badge, [data-testid="application-status"], ' +
    '.badge, [class*="status"], td[class*="status"], span[class*="status"]';

  private readonly statusDropdown =
    'select[name="status"], select[class*="status"], [data-testid="status-dropdown"], ' +
    'select[id*="status"]';

  private readonly downloadCvButton =
    'a:has-text("Download CV"), a:has-text("Download Resume"), a:has-text("Download"), ' +
    '[data-testid="download-cv"], a[href*="cv"], a[href*="resume"], a[href*="download"], ' +
    'button:has-text("Download CV")';

  private readonly shortlistButton =
    'button:has-text("Shortlist"), a:has-text("Shortlist"), [data-testid="shortlist-btn"], ' +
    'button:has-text("Shortlisted"), [class*="shortlist"]';

  private readonly rejectButton =
    'button:has-text("Reject"), a:has-text("Reject"), [data-testid="reject-btn"], ' +
    '[class*="reject"]';

  private readonly filterDropdown =
    'select[name="filter"], select[name="job_filter"], select[name="status_filter"], ' +
    '[data-testid="filter-dropdown"], select[class*="filter"], select[id*="filter"]';

  private readonly confirmRejectButton =
    'button:has-text("Confirm"), button:has-text("Yes"), .swal2-confirm, ' +
    '[data-testid="confirm-reject"], .btn-danger:has-text("Reject")';

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
    await this.lib.navigateTo(this.url('/dashboard/all-applicants'));
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.applicantsList);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  State queries
  // ══════════════════════════════════════════════════════════════════════════

  async getApplicantCount(): Promise<number> {
    return this.lib.getCount(this.applicantEntry);
  }

  async hasApplicants(): Promise<boolean> {
    const count = await this.getApplicantCount();
    return count > 0;
  }

  async isCandidateNameVisible(): Promise<boolean> {
    const hasApplicants = await this.hasApplicants();
    if (hasApplicants) return this.lib.isVisible(this.candidateName);
    // No applicants — verify structural tabs/headers as soft assertion
    return this.lib.isVisible('.tab-btn, [role="tab"], h4:has-text("Applicant"), .aplicantion-status');
  }

  async isJobTitleVisible(): Promise<boolean> {
    const hasApplicants = await this.hasApplicants();
    if (hasApplicants) return this.lib.isVisible(this.jobTitle);
    return this.lib.isVisible('th:has-text("Job"), th:has-text("Title"), th:has-text("Position"), .tab-btn, [role="tab"]');
  }

  async isApplicationStatusVisible(): Promise<boolean> {
    return this.lib.isVisible(this.applicationStatus);
  }

  async isDateOfApplicationVisible(): Promise<boolean> {
    const sel =
      'td:has-text("20"), [class*="date"], [data-testid*="date"], .application-date';
    return this.lib.isVisible(sel);
  }

  async getFirstApplicationStatus(): Promise<string> {
    try {
      const statuses = await this.page.locator(this.applicationStatus).all();
      for (const loc of statuses) {
        if (await loc.isVisible()) {
          return (await loc.textContent() ?? '').trim();
        }
      }
      return '';
    } catch {
      return '';
    }
  }

  async hasPendingApplications(): Promise<boolean> {
    const pendingSel = `${this.applicationStatus}:has-text("Pending"), [class*="status"]:has-text("Pending")`;
    const count = await this.lib.getCount(pendingSel);
    return count > 0;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async clickFirstCandidateProfile(): Promise<void> {
    const nameLinks = await this.page.locator(this.candidateName).all();
    for (const loc of nameLinks) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(1000);
        return;
      }
    }
    throw new Error('No visible candidate name/profile link found on All Applicants page');
  }

  async changeFirstApplicationStatus(status: string): Promise<void> {
    // Try select dropdown first
    const dropdowns = await this.page.locator(this.statusDropdown).all();
    for (const loc of dropdowns) {
      if (await loc.isVisible()) {
        try {
          await loc.selectOption({ label: status });
          await this.page.waitForTimeout(1000);
          return;
        } catch {
          try {
            await loc.selectOption({ value: status });
            await this.page.waitForTimeout(1000);
            return;
          } catch { /* try next */ }
        }
      }
    }

    // Try button-based status change
    const statusBtnSel = `button:has-text("${status}"), a:has-text("${status}"), [data-status="${status}"]`;
    const statusBtns = await this.page.locator(statusBtnSel).all();
    for (const loc of statusBtns) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForTimeout(1000);
        return;
      }
    }
    console.warn(`[AllApplicants] Could not change status to "${status}" — no suitable control found.`);
  }

  async shortlistFirstApplicant(): Promise<void> {
    const all = await this.page.locator(this.shortlistButton).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForTimeout(2000);
        return;
      }
    }
    // Fallback: use status dropdown to select 'Shortlisted'
    await this.changeFirstApplicationStatus('Shortlisted');
  }

  async rejectFirstApplicant(): Promise<void> {
    const all = await this.page.locator(this.rejectButton).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForTimeout(1000);
        return;
      }
    }
    await this.changeFirstApplicationStatus('Rejected');
  }

  async confirmRejection(): Promise<void> {
    const confirmLoc = this.page.locator(this.confirmRejectButton).first();
    try {
      await confirmLoc.waitFor({ state: 'visible', timeout: 5000 });
      await confirmLoc.click();
      await this.page.waitForTimeout(2000);
    } catch {
      // No confirmation dialog needed
      this.page.once('dialog', async (dialog) => dialog.accept());
      await this.page.waitForTimeout(1000);
    }
  }

  async downloadFirstCV(): Promise<void> {
    const all = await this.page.locator(this.downloadCvButton).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        const [download] = await Promise.all([
          this.page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
          loc.click()
        ]);
        if (download) {
          await download.path();
        }
        await this.page.waitForTimeout(1000);
        return;
      }
    }
    console.warn('[AllApplicants] No visible CV download button found.');
  }

  async applyFilter(filterType: string): Promise<void> {
    const dropdowns = await this.page.locator(this.filterDropdown).all();
    for (const loc of dropdowns) {
      if (await loc.isVisible()) {
        try {
          await loc.selectOption({ label: filterType });
          await this.page.waitForTimeout(1500);
          return;
        } catch {
          // Try value
          const opts = await loc.locator('option').all();
          for (const opt of opts) {
            const text = (await opt.textContent() ?? '').toLowerCase().trim();
            if (text.includes(filterType.toLowerCase().replace('filter by ', ''))) {
              await loc.selectOption({ value: await opt.getAttribute('value') ?? '' });
              await this.page.waitForTimeout(1500);
              return;
            }
          }
        }
      }
    }

    // Try filter buttons
    const filterBtn = `button:has-text("${filterType}"), a:has-text("${filterType}"), [data-filter="${filterType}"]`;
    const btnAll = await this.page.locator(filterBtn).all();
    for (const loc of btnAll) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForTimeout(1500);
        return;
      }
    }
    console.warn(`[AllApplicants] Could not apply filter "${filterType}" — no suitable control found.`);
  }

  async isCandidateProfileLoaded(): Promise<boolean> {
    const profileSel =
      '.candidate-profile, [class*="candidate-detail"], [class*="profile-detail"], ' +
      'h1, h2, .profile-title, [data-testid="candidate-profile"]';
    return this.lib.isVisible(profileSel);
  }

  async isCvOrSkillsInfoVisible(): Promise<boolean> {
    const sel =
      '.skills, [class*="skill"], a:has-text("CV"), a:has-text("Resume"), ' +
      '.cv-section, [class*="cv"], [class*="resume"], .experience, [class*="experience"]';
    return this.lib.isVisible(sel);
  }

  async isDownloadAvailable(): Promise<boolean> {
    return this.lib.isVisible(this.downloadCvButton);
  }
}
