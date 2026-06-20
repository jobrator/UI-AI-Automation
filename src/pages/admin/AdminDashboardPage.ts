import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminDashboardPage — Page Object for the Jobrator Admin dashboard.
 */
export class AdminDashboardPage extends BasePage {
  // ── Layout ────────────────────────────────────────────────────────────────
  private readonly sidebar =
    '.sidebar, nav[class*="sidebar"], aside, [class*="sidenav"], [class*="side-nav"]';

  // ── Statistics section ────────────────────────────────────────────────────
  private readonly statsSection =
    '[class*="stat"], [class*="card"], [class*="count"], [class*="summary"], [class*="overview"], .dashboard-stats';

  private readonly usersCount =
    '*:has-text("Users"), *:has-text("Total Users"), *:has-text("user"), [class*="user-count"]';

  private readonly candidatesCount =
    '*:has-text("Candidates"), *:has-text("Total Candidates"), [class*="candidate-count"]';

  private readonly companiesCount =
    '*:has-text("Companies"), *:has-text("Total Companies"), [class*="company-count"]';

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(adminUrl);
    await this.page.waitForTimeout(1500);
  }

  async isLoaded(): Promise<boolean> {
    const hasSidebar = await this.lib.isVisible(this.sidebar);
    const hasStats = await this.lib.isVisible(this.statsSection);
    return hasSidebar || hasStats;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async navigateToSection(section: string): Promise<void> {
    const link = `a:has-text("${section}"), [href*="${section.toLowerCase().replace(/\s+/g, '-')}"]`;
    const exists = await this.lib.isVisible(link);
    if (exists) {
      await this.lib.click(link);
    } else {
      console.warn(`[AdminDashboard] Section link not found: "${section}"`);
    }
  }

  // ── State queries ─────────────────────────────────────────────────────────

  async hasStatisticsSection(): Promise<boolean> {
    return this.lib.isVisible(this.statsSection);
  }

  async hasUsersCount(): Promise<boolean> {
    return this.lib.isVisible(this.usersCount);
  }

  async hasCandidatesCount(): Promise<boolean> {
    return this.lib.isVisible(this.candidatesCount);
  }

  async hasCompaniesCount(): Promise<boolean> {
    return this.lib.isVisible(this.companiesCount);
  }

  async getStatistics(): Promise<{ users: string; candidates: string; companies: string }> {
    const getText = async (sel: string): Promise<string> => {
      const visible = await this.lib.isVisible(sel);
      if (!visible) return '0';
      try { return await this.lib.getText(sel); } catch { return '0'; }
    };
    return {
      users: await getText(this.usersCount),
      candidates: await getText(this.candidatesCount),
      companies: await getText(this.companiesCount)
    };
  }
}
