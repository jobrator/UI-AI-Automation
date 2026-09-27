import { BaseScreen } from './BaseScreen';
import { Locators } from '../lib/Locators';

export type Profile = 'Candidate' | 'Employer';

/**
 * SignInScreen — the onboarding + sign-in journey.
 *
 * Covers the path described in ADO #29941 / #29945 / #29947:
 *   Get Started → bottom-tab menu → "sign in" option → credentials → Sign In
 *   → optional confirmation modal.
 */
export class SignInScreen extends BaseScreen {
  // ── Onboarding ────────────────────────────────────────────────────────────
  private readonly candidateGetStarted = this.control('candidate-get-started', 'Get Started');
  private readonly companyGetStarted = this.control('company-get-started', 'Get Started');

  // ── Sign-in entry points ──────────────────────────────────────────────────
  private readonly candidateSignInOption = this.control('candidate-signin-option', 'Sign In');
  private readonly employerSignInOption = this.control('employer-signin-option', 'Sign In');

  // ── Form ──────────────────────────────────────────────────────────────────
  private readonly emailField = Locators.any(
    Locators.accessibilityId('email-input'),
    Locators.resourceId('email'),
    Locators.input(0),
  );
  private readonly passwordField = Locators.any(
    Locators.accessibilityId('password-input'),
    Locators.resourceId('password'),
    Locators.secureInput(0),
  );
  private readonly signInButton = this.control('signin-button', 'Sign In');

  // ── Feedback ──────────────────────────────────────────────────────────────
  private readonly loginModalOk = Locators.any(
    Locators.accessibilityId('login-modal-ok'),
    Locators.text('OK'),
    Locators.text('Ok'),
  );

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.signInButton, 8000);
  }

  /** Tap the "Get Started" entry for the given profile. */
  async tapGetStarted(profile: Profile): Promise<void> {
    const target = profile === 'Candidate' ? this.candidateGetStarted : this.companyGetStarted;
    await this.lib.tapIfPresent(target, `${profile} Get Started`, 8000);
  }

  /** Open a bottom-tab / drawer menu such as "myjob", "application" or "more". */
  async navigateToMenu(menu: string): Promise<void> {
    await this.lib.tap(
      Locators.any(
        Locators.accessibilityId(`${menu}-tab`),
        Locators.accessibilityId(menu),
        Locators.text(menu),
        Locators.partialText(menu),
      ),
      `"${menu}" menu`,
    );
  }

  async selectSignInOption(profile: Profile): Promise<void> {
    const target = profile === 'Candidate' ? this.candidateSignInOption : this.employerSignInOption;
    await this.lib.tap(target, `${profile} sign-in option`);
  }

  async enterCredentials(email: string, password: string): Promise<void> {
    await this.lib.type(this.emailField, email, 'email field');
    await this.lib.type(this.passwordField, password, 'password field');
  }

  async tapSignIn(): Promise<void> {
    await this.lib.tap(this.signInButton, 'Sign In button');
  }

  /** Dismiss the post-login confirmation modal if the build shows one. */
  async dismissLoginModal(): Promise<boolean> {
    return this.lib.tapIfPresent(this.loginModalOk, 'login modal OK', 8000);
  }

  /**
   * Whole sign-in journey, used by the @requires-candidate-login hook so that
   * scenarios about other screens do not restate onboarding.
   */
  async signInAsCandidate(email: string, password: string): Promise<void> {
    await this.tapGetStarted('Candidate');
    await this.navigateToMenu('myjob');
    await this.selectSignInOption('Candidate');
    await this.enterCredentials(email, password);
    await this.tapSignIn();
    await this.dismissLoginModal();
  }

  async signInAsEmployer(email: string, password: string): Promise<void> {
    await this.tapGetStarted('Employer');
    await this.navigateToMenu('application');
    await this.selectSignInOption('Employer');
    await this.enterCredentials(email, password);
    await this.tapSignIn();
    await this.dismissLoginModal();
  }

  /** Visible authentication error, if any — drives ADO #29945 / #29947. */
  async getAuthError(): Promise<string> {
    const candidates = Locators.any(
      Locators.accessibilityId('login-error'),
      Locators.partialText('Invalid credentials'),
      Locators.partialText('Invalid'),
      Locators.partialText('incorrect'),
      Locators.partialText('failed'),
    );
    const el = await this.lib.resolve(candidates, 10000);
    if (!el) return '';
    return (await el.getText().catch(() => '')) ?? '';
  }
}
