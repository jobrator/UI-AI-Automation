import { BaseScreen } from './BaseScreen';
import { Locators } from '../lib/Locators';

/**
 * MyJobsScreen — the authenticated landing screen for a candidate
 * (ADO #29941's "Then user should see my jobs screen").
 */
export class MyJobsScreen extends BaseScreen {
  private readonly heading = Locators.any(
    Locators.accessibilityId('my-jobs-screen'),
    Locators.text('My Jobs'),
    Locators.partialText('My Job'),
  );

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.heading, 20000);
  }

  /** True once any authenticated-only affordance is on screen. */
  async isAuthenticated(): Promise<boolean> {
    if (await this.isLoaded()) return true;
    return this.lib.isVisible(
      Locators.any(
        Locators.accessibilityId('more-tab'),
        Locators.text('More'),
        Locators.partialText('Applied'),
      ),
      8000,
    );
  }
}
