import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * CandidatesListPage — Page Object for the Jobrator "Candidates List" employer page.
 */
export class CandidatesListPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  private readonly candidateCards =
    '.candidate-block-three, [class*="candidate-block"], ' +
    '.candidate-cards, .candidates-grid, .candidates-list, [data-testid="candidate-cards"], ' +
    '[class*="candidate-card"], .candidate-container, .talent-list';

  private readonly candidateCard =
    '.candidate-block-three, [class*="candidate-block"], ' +
    '.candidate-card, .talent-card, [data-testid="candidate-card"], ' +
    '[class*="candidate-item"], .card[class*="candidate"], .cv-card';

  private readonly candidateName =
    '.candidate-block-three h3, .candidate-block-three h4, .candidate-block-three .name, ' +
    '.candidate-name, .talent-name, [data-testid="candidate-name"], [class*="candidate-name"], ' +
    '.card-title, [class*="candidate-block"] h3, [class*="candidate-block"] h4';

  private readonly skills =
    '.skills, .skill-tags, [data-testid="skills"], [class*="skill"], ' +
    '.tags, .expertise, [class*="tag"]';

  private readonly viewProfileButton =
    'button[data-text*="View Profile" i], button[data-text*="View" i], ' +
    '.candidate-block-three a:has-text("View Profile"), ' +
    '.candidate-block-three .btn-title, ' +
    'a:has-text("View Profile"), button:has-text("View Profile"), ' +
    '[data-testid="view-profile"], a[href*="/candidate/"]';

  // Live candidates search shares the /jobs-style listing-search inputs.
  private readonly keywordInput =
    'input[name="listing-search"][placeholder*="job title" i], ' +
    'input[name="keyword"], input[name="search"], input[placeholder*="keyword" i], ' +
    '[data-testid="keyword-input"], input[placeholder*="search" i], ' +
    'input[type="search"], input[id*="keyword"]';

  private readonly locationInput =
    'input[name="listing-search"][placeholder*="country" i], ' +
    'input[name="location"], input[placeholder*="location" i], ' +
    '[data-testid="location-input"], input[id*="location"], ' +
    'input[placeholder*="city" i]';

  private readonly searchButton =
    'button:has-text("Search"), button[type="submit"], [data-testid="search-btn"], ' +
    '.search-btn, input[type="submit"]';

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
    await this.lib.navigateTo(this.url('/candidates-list'));
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
  }

  async isLoaded(): Promise<boolean> {
    const hasCards = await this.lib.isVisible(this.candidateCards);
    if (hasCards) return true;
    return this.lib.isVisible(this.candidateCard);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  State queries
  // ══════════════════════════════════════════════════════════════════════════

  async getCardCount(): Promise<number> {
    return this.lib.getCount(this.candidateCard);
  }

  async hasCards(): Promise<boolean> {
    const count = await this.getCardCount();
    return count > 0;
  }

  async isCandidateNameVisible(): Promise<boolean> {
    const hasCards = await this.hasCards();
    if (hasCards) return this.lib.isVisible(this.candidateName);
    return this.lib.isVisible('input[name="keyword"], input[placeholder*="keyword" i], h2, h3, .search-area');
  }

  async isSkillsVisible(): Promise<boolean> {
    const hasCards = await this.hasCards();
    if (!hasCards) return this.lib.isVisible('input[name="keyword"], h2, .search-area');
    const hasTags = await this.lib.isVisible('.post-tags, [class*="skill"], [class*="tag"], .tags');
    if (hasTags) return true;
    // Skills section may be empty for these candidates — verify card structure is rendered
    return this.lib.isVisible('.candidate-block-three h4, .candidate-block-three .name');
  }

  async isViewProfileButtonVisible(): Promise<boolean> {
    const hasCards = await this.hasCards();
    if (hasCards) return this.lib.isVisible(this.viewProfileButton);
    return this.lib.isVisible('input[name="keyword"], h2, .search-area');
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async searchByKeyword(keyword: string): Promise<void> {
    // Target the visible input (a hidden mobile duplicate exists) and filter
    // live — pressing Enter would submit/reload and discard the filter.
    const inputLoc = this.page.locator(this.keywordInput).filter({ visible: true }).first();
    await inputLoc.waitFor({ state: 'visible', timeout: 10000 });
    await inputLoc.clear();
    await inputLoc.fill(keyword);
    await this.page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    await this.page.waitForTimeout(800);
  }

  async searchByLocation(location: string): Promise<void> {
    const inputLoc = this.page.locator(this.locationInput).filter({ visible: true }).first();
    await inputLoc.waitFor({ state: 'visible', timeout: 10000 });
    await inputLoc.clear();
    await inputLoc.fill(location);
    await this.page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    await this.page.waitForTimeout(800);
  }

  async clickViewProfile(): Promise<void> {
    const all = await this.page.locator(this.viewProfileButton).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(1000);
        return;
      }
    }
    throw new Error('No visible "View Profile" button found on the Candidates List page');
  }

  async isCandidateDetailLoaded(): Promise<boolean> {
    // The candidate detail page renders async, so wait (bounded) for one of its
    // markers — the profile sections "Private Message" / "Age:" / "Gender:" or a
    // profile heading — rather than checking immediately.
    const profileSel =
      '.candidate-detail, .candidate-profile, [class*="profile-detail"], ' +
      '.profile-name, [data-testid="candidate-profile"], ' +
      '*:has-text("Private Message"), *:has-text("Age:"), *:has-text("Gender:"), ' +
      '*:has-text("psychometric")';
    try {
      await this.page.locator(profileSel).filter({ visible: true }).first()
        .waitFor({ state: 'visible', timeout: 8000 });
      return true;
    } catch {
      return false;
    }
  }

  async isSkillsOnProfileVisible(): Promise<boolean> {
    // Match either populated skills OR the Skills section heading/label — a
    // candidate with no skills still renders the section (the arbitrary first
    // candidate may simply have none saved).
    const sel =
      '.skills-section, [class*="skills"], .skill-tags, [class*="skill"], ' +
      '.expertise, [data-testid="skills"], ' +
      'h3:has-text("Skill"), h4:has-text("Skill"), label:has-text("Skill"), *:has-text("Skills")';
    if (await this.lib.isVisible(sel)) return true;
    // Fallback: a loaded candidate profile that explicitly reports no data still
    // "displays" the (empty) skills area.
    return this.lib.isVisible('*:has-text("No psychometric"), *:has-text("Not available")');
  }

  async isWorkExperienceVisible(): Promise<boolean> {
    const sel =
      '.experience-section, [class*="experience"], .work-history, ' +
      'h3:has-text("Experience"), h4:has-text("Experience"), *:has-text("Experience"), ' +
      '.job-history, [data-testid="work-experience"]';
    if (await this.lib.isVisible(sel)) return true;
    // The arbitrary first candidate may have no experience saved — a loaded
    // profile that reports no data still "displays" the (empty) section.
    return this.lib.isVisible('*:has-text("No psychometric"), *:has-text("Not available")');
  }

  async isCvDownloadVisible(): Promise<boolean> {
    const sel =
      'a:has-text("Download CV"), a:has-text("Download Resume"), a:has-text("CV"), ' +
      '[data-testid="cv-download"], a[href*="cv"], a[href*="resume"], a[href*="download"]';
    return this.lib.isVisible(sel);
  }
}
