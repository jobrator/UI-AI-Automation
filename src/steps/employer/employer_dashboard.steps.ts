import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { EmployerDashboardPage } from '../../pages/EmployerDashboardPage';

function getPage(world: CustomWorld): EmployerDashboardPage {
  return new EmployerDashboardPage(world.page);
}

// ═══════════════════════════════════════════════════════════════════════════
//  GIVEN — Preconditions
// ═══════════════════════════════════════════════════════════════════════════

Given('the authenticated employer is on the employer dashboard',
  async function (this: CustomWorld) {
    // @requires-employer-login hook has already logged the employer in.
    // Navigate to the dashboard page.
    const dashboardPage = getPage(this);
    await dashboardPage.navigate();
    this.logMessage(`[EmployerDashboard] Navigated to employer dashboard → ${this.page.url()}`);
  }
);

Given('the employer has unread notifications',
  async function (this: CustomWorld) {
    // Soft precondition: if notifications already exist, proceed.
    // If not, log a warning — creating real notifications requires candidate actions.
    const dashboardPage = getPage(this);
    const hasNotifications = await dashboardPage.hasUnreadNotifications();
    if (!hasNotifications) {
      console.warn(
        '[EmployerDashboard] No unread notifications found. ' +
        'This scenario assumes pre-existing test data. Proceeding anyway.'
      );
    }
    this.logMessage(`[EmployerDashboard] Unread notifications present: ${hasNotifications}`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  THEN — Assertions
// ═══════════════════════════════════════════════════════════════════════════

Then('the employer dashboard should be fully loaded',
  async function (this: CustomWorld) {
    const dashboardPage = getPage(this);
    const loaded = await dashboardPage.isLoaded();
    expect(loaded, 'Employer dashboard should be fully loaded — expected logout control or employer nav to be visible').toBeTruthy();
  }
);

Then('the employer dashboard should display company navigation items',
  async function (this: CustomWorld) {
    const dashboardPage = getPage(this);
    const navVisible = await dashboardPage.isNavItemsVisible();
    expect(
      navVisible,
      'Employer dashboard should display company navigation items (nav links)'
    ).toBeTruthy();
  }
);

Then('the employer dashboard should display key hiring statistics',
  async function (this: CustomWorld) {
    const dashboardPage = getPage(this);
    const statsVisible = await dashboardPage.isStatsVisible();
    expect(
      statsVisible,
      'Employer dashboard should display key hiring statistics (stat cards/counters)'
    ).toBeTruthy();
  }
);

Then('the notification badge on the employer dashboard should display a non-zero count',
  async function (this: CustomWorld) {
    const dashboardPage = getPage(this);
    const count = await dashboardPage.getNotificationCount();
    expect(count, 'Notification badge should display a non-zero count').toBeGreaterThan(0);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  WHEN — Actions
// ═══════════════════════════════════════════════════════════════════════════

When('the employer clicks the Post A New Job link on the dashboard',
  async function (this: CustomWorld) {
    const dashboardPage = getPage(this);
    await dashboardPage.clickPostNewJob();
    this.logMessage(`[EmployerDashboard] Clicked Post A New Job → ${this.page.url()}`);
  }
);

When('the employer clicks the Manage Jobs link on the dashboard',
  async function (this: CustomWorld) {
    const dashboardPage = getPage(this);
    await dashboardPage.clickManageJobs();
    this.logMessage(`[EmployerDashboard] Clicked Manage Jobs → ${this.page.url()}`);
  }
);

When('the employer clicks the Logout control on the dashboard',
  async function (this: CustomWorld) {
    const dashboardPage = getPage(this);
    await dashboardPage.logout();
    this.logMessage(`[EmployerDashboard] Clicked Logout → ${this.page.url()}`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  THEN — Navigation results
// ═══════════════════════════════════════════════════════════════════════════

Then('the post new job page should load',
  async function (this: CustomWorld) {
    await this.page.waitForLoadState('domcontentloaded');
    const url = this.page.url();
    expect(
      url.match(/post-job|post-jobs|post_job|new-job|create-job|jobs\/create/i),
      `Expected post new job page but URL is: ${url}`
    ).toBeTruthy();
  }
);

Then('the manage jobs page should load',
  async function (this: CustomWorld) {
    await this.page.waitForLoadState('domcontentloaded');
    const url = this.page.url();
    expect(
      url.match(/manage-job|manage_job|my-job|employer-job|jobs\/manage/i),
      `Expected manage jobs page but URL is: ${url}`
    ).toBeTruthy();
  }
);

Then('the employer session should be destroyed',
  async function (this: CustomWorld) {
    // After logout, the page should be on login or home — not an authenticated employer page
    const url = this.page.url();
    const isLoggedOut = /login|signin|logout|home|\/$/.test(url) ||
      !/dashboard|employer|recruiter/.test(url);
    expect(
      isLoggedOut,
      `Expected session to be destroyed (redirected away from dashboard) but URL is: ${url}`
    ).toBeTruthy();
  }
);

Then('the employer should be redirected to the login page',
  async function (this: CustomWorld) {
    const url = this.page.url();
    expect(
      url.match(/login|signin|auth/i),
      `Expected employer to be redirected to the login page but URL is: ${url}`
    ).toBeTruthy();
  }
);
