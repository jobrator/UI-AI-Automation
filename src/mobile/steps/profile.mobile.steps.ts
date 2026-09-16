import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { MobileWorld } from '../support/mobile.world';
import { MoreMenuScreen } from '../screens/MoreMenuScreen';
import { CandidateProfileScreen } from '../screens/CandidateProfileScreen';
import { CompanyProfileScreen } from '../screens/CompanyProfileScreen';

// ═══════════════════════════════════════════════════════════════════════════════
//  Candidate profile — ADO #29942
// ═══════════════════════════════════════════════════════════════════════════════

When('user tap on the My Profile', async function (this: MobileWorld) {
  await new MoreMenuScreen(this.driver).openMyProfile();
});

When(
  'user edit Candidate {string} with {string}',
  async function (this: MobileWorld, field: string, value: string) {
    await new CandidateProfileScreen(this.driver).editField(field, value);
  },
);

When(
  'user tap to select Candidate {string} and tap on Done',
  async function (this: MobileWorld, picker: string) {
    await new CandidateProfileScreen(this.driver).selectFromPicker(picker);
  },
);

When('user tap the Save button', async function (this: MobileWorld) {
  await new CandidateProfileScreen(this.driver).save();
});

Then(
  'user should see profile Updated Successfully popup screen',
  async function (this: MobileWorld) {
    const screen = new CandidateProfileScreen(this.driver);
    const ok = await screen.isUpdateSuccessVisible();
    if (!ok) await this.attachScreenshot('profile-update-no-confirmation');
    expect(
      ok,
      'Expected a "profile Updated Successfully" popup after saving the candidate profile.',
    ).toBe(true);
  },
);

Then(
  'the Candidate {string} should still be {string}',
  async function (this: MobileWorld, field: string, expected: string) {
    const actual = await new CandidateProfileScreen(this.driver).readField(field);
    expect(actual.trim(), `Expected ${field} to persist as "${expected}".`).toContain(expected);
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
//  Company profile — ADO #29946
// ═══════════════════════════════════════════════════════════════════════════════

When('user tap on the company Profile', async function (this: MobileWorld) {
  await new MoreMenuScreen(this.driver).openCompanyProfile();
});

When(
  'user edit Company {string} with {string}',
  async function (this: MobileWorld, field: string, value: string) {
    await new CompanyProfileScreen(this.driver).editField(field, value);
  },
);

When('user tap on Save button', async function (this: MobileWorld) {
  await new CompanyProfileScreen(this.driver).save();
});

When(
  'user tap OK on profile Updated Successfully popup screen',
  async function (this: MobileWorld) {
    const screen = new CompanyProfileScreen(this.driver);
    const shown = await screen.isUpdateSuccessVisible();
    if (!shown) await this.attachScreenshot('company-update-no-confirmation');
    expect(
      shown,
      'Expected an "Updated Successfully" popup after saving the company profile.',
    ).toBe(true);
    await screen.dismissSuccessPopup();
  },
);

Then('user should see more screen', async function (this: MobileWorld) {
  const more = new MoreMenuScreen(this.driver);
  expect(
    await more.isLoaded(),
    'Expected to return to the More screen after saving the company profile.',
  ).toBe(true);
});
