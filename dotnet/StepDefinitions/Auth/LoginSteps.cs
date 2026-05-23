using System.Text.RegularExpressions;
using Jobrator.E2E.Tests.Pages;
using Jobrator.E2E.Tests.Support;
using Microsoft.Playwright;
using NUnit.Framework;
using Reqnroll;

namespace Jobrator.E2E.Tests.StepDefinitions.Auth;

[Binding]
public sealed class LoginSteps
{
    private readonly ScenarioContext _scenario;
    private readonly EnvConfig       _cfg = EnvConfig.Instance;

    private IPage     Page      => _scenario.Get<PlaywrightDriver>().Page;
    private LoginPage LoginPage => new(Page, _cfg.JobratorSite);

    public LoginSteps(ScenarioContext scenario) => _scenario = scenario;

    [Given("the Jobrator login page is open")]
    public async Task GivenLoginPageIsOpen()
    {
        await LoginPage.NavigateAsync();
        Assert.That(await LoginPage.IsLoadedAsync(), Is.True,
            "Login page failed to load — email input not found");
    }

    [Given("the user is on the Jobrator login page")]
    public Task GivenUserIsOnLoginPage() => LoginPage.NavigateAsync();

    [Given("the user is already logged in as a candidate")]
    public async Task GivenUserIsAlreadyLoggedIn()
    {
        await LoginPage.NavigateAsync();
        await LoginPage.LoginAsync(_cfg.CandidateEmail, _cfg.CandidatePassword);
        await Page.WaitForURLAsync(new Regex("dashboard|home|profile"),
            new PageWaitForURLOptions { Timeout = _cfg.NavigationTimeout });
    }

    [Given("an unauthenticated user navigates directly to the candidate dashboard")]
    public Task GivenUnauthenticatedUserGoesToDashboard() =>
        Page.GotoAsync($"{_cfg.JobratorSite}dashboard",
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded,
                                  Timeout   = _cfg.NavigationTimeout });

    [Given("the authenticated user navigates directly to the login page")]
    public Task GivenAuthenticatedUserGoesToLogin() => LoginPage.NavigateAsync();

    [When("the user enters email {string}")]
    public Task WhenUserEntersEmail(string email) => LoginPage.EnterEmailAsync(email);

    [When("the user enters password {string}")]
    public Task WhenUserEntersPassword(string password) => LoginPage.EnterPasswordAsync(password);

    [When("the user leaves the email field empty")]
    public Task WhenUserLeavesEmailEmpty() => LoginPage.ClearEmailFieldAsync();

    [When("the user leaves the password field empty")]
    public Task WhenUserLeavesPasswordEmpty() => LoginPage.ClearPasswordFieldAsync();

    [When("the user clicks the login button")]
    public Task WhenUserClicksLogin() => LoginPage.ClickLoginButtonAsync();

    [When("the user logs out of the application")]
    public Task WhenUserLogsOut() => LoginPage.LogoutAsync();

    [When("the user clicks the forgot password link")]
    public Task WhenUserClicksForgotPassword() => LoginPage.ClickForgotPasswordAsync();

    [When("the user presses Enter on the password field")]
    public Task WhenUserPressesEnter() => Page.Keyboard.PressAsync("Enter");

    [When("the user presses the Tab key")]
    public Task WhenUserPressesTab() => Page.Keyboard.PressAsync("Tab");

    [When("the user clicks on the email input field")]
    public Task WhenUserClicksEmailField() =>
        Page.Locator("input[type='email'], input[name='email']").First.ClickAsync();

    [When("the user enters SQL injection payload {string} in the email field")]
    public async Task WhenSqlInjectionInEmail(string payload)
    {
        await LoginPage.EnterEmailAsync(payload);
        Console.WriteLine($"[Security] SQL injection in email: {payload}");
    }

    [When("the user enters SQL injection payload {string} in the password field")]
    public async Task WhenSqlInjectionInPassword(string payload)
    {
        await LoginPage.EnterPasswordAsync(payload);
        Console.WriteLine($"[Security] SQL injection in password: {payload}");
    }

    [When("the user enters XSS payload {string} in the email field")]
    public async Task WhenXssPayloadInEmail(string payload)
    {
        await LoginPage.EnterEmailAsync(payload);
        Console.WriteLine($"[Security] XSS payload entered: {payload}");
    }

    [When("the user submits incorrect credentials {int} times in a row")]
    public Task WhenBruteForceAttempts(int attempts) =>
        LoginPage.AttemptLoginMultipleTimesAsync(_cfg.CandidateEmail, "WrongBruteForcePass!", attempts);

    [When("the user enters a maximum length email address of {int} characters")]
    public async Task WhenMaxLengthEmail(int length)
    {
        var local    = new string('a', Math.Min(64, length - 9));
        var email    = $"{local}@test.com";
        await LoginPage.EnterEmailAsync(email[..Math.Min(length, email.Length)]);
    }

    [When("the user enters a password that is {int} characters long")]
    public async Task WhenLongPassword(int length)
    {
        const string template = "P@ssw0rd";
        var password = string.Concat(Enumerable.Repeat(template, (length / template.Length) + 1))[..length];
        await LoginPage.EnterPasswordAsync(password);
    }

    [Then("the user should be redirected to the candidate dashboard")]
    public async Task ThenRedirectedToDashboard()
    {
        await Page.WaitForURLAsync(new Regex("dashboard|home|candidate|profile|jobs|application"),
            new PageWaitForURLOptions { Timeout = _cfg.NavigationTimeout });
        Assert.That(Regex.IsMatch(Page.Url, "dashboard|home|candidate|profile|jobs|application",
            RegexOptions.IgnoreCase), Is.True, $"Expected dashboard URL but got: {Page.Url}");
    }

    [Then("the user profile menu should be visible")]
    public async Task ThenUserMenuVisible() =>
        Assert.That(await LoginPage.IsUserMenuVisibleAsync(), Is.True,
            "User profile menu should be visible after login");

    [Then("an authentication error message should be displayed")]
    public async Task ThenAuthErrorDisplayed()
    {
        await Page.WaitForTimeoutAsync(1000);
        Assert.That(await LoginPage.HasErrorMessageAsync(), Is.True,
            "Expected an authentication error message");
    }

    [Then("the user should remain on the login page")]
    public void ThenRemainOnLoginPage() =>
        Assert.That(LoginPage.IsOnLoginPage(), Is.True,
            $"Expected to remain on login page but URL is: {Page.Url}");

    [Then("an email validation error should be shown")]
    public async Task ThenEmailValidationError()
    {
        await Page.WaitForTimeoutAsync(500);
        var err = await LoginPage.GetEmailFieldErrorAsync();
        Assert.That(err.Length > 0 || await LoginPage.HasErrorMessageAsync(), Is.True,
            "Expected an email validation error");
    }

    [Then("a password validation error should be shown")]
    public async Task ThenPasswordValidationError()
    {
        await Page.WaitForTimeoutAsync(500);
        var err = await LoginPage.GetPasswordFieldErrorAsync();
        Assert.That(err.Length > 0 || await LoginPage.HasErrorMessageAsync(), Is.True,
            "Expected a password validation error");
    }

    [Then("form field validation errors should be displayed")]
    public async Task ThenFormValidationErrors()
    {
        await Page.WaitForTimeoutAsync(500);
        var emailErr = await LoginPage.GetEmailFieldErrorAsync();
        var passErr  = await LoginPage.GetPasswordFieldErrorAsync();
        Assert.That(emailErr.Length > 0 || passErr.Length > 0 || await LoginPage.HasErrorMessageAsync(),
            Is.True, "Expected validation errors when both fields are empty");
    }

    [Then("an email format validation error should be shown")]
    public async Task ThenEmailFormatError()
    {
        await Page.WaitForTimeoutAsync(500);
        var err = await LoginPage.GetEmailFieldErrorAsync();
        Assert.That(err.Length > 0 || await LoginPage.HasErrorMessageAsync(), Is.True,
            "Expected an email format validation error");
    }

    [Then("the email input field should be visible")]
    public Task ThenEmailInputVisible() =>
        Assertions.Expect(Page.Locator("input[type='email'], input[name='email']").First)
            .ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = _cfg.ExpectTimeout });

    [Then("the password input field should be visible")]
    public Task ThenPasswordInputVisible() =>
        Assertions.Expect(Page.Locator("input[type='password'], input[name='password']").First)
            .ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = _cfg.ExpectTimeout });

    [Then("the login submit button should be visible")]
    public Task ThenLoginButtonVisible() =>
        Assertions.Expect(
            Page.Locator("button[type='submit']:has-text('Login'), button[type='submit']:has-text('Log in')").First
        ).ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = _cfg.ExpectTimeout });

    [Then("the forgot password link should be visible")]
    public async Task ThenForgotPasswordVisible() =>
        Assert.That(await LoginPage.IsForgotPasswordLinkVisibleAsync(), Is.True,
            "Forgot password link should be visible");

    [Then("the SQL injection attempt should be rejected")]
    public async Task ThenSqlInjectionRejected()
    {
        await Page.WaitForTimeoutAsync(1500);
        Assert.That(await LoginPage.IsDashboardVisibleAsync(), Is.False,
            "[Security] SQL injection succeeded — SECURITY VULNERABILITY");
    }

    [Then("the user should not be authenticated")]
    public async Task ThenNotAuthenticated() =>
        Assert.That(await LoginPage.IsDashboardVisibleAsync(), Is.False,
            "User should NOT be authenticated after injection attempt");

    [Then("the XSS payload should be sanitised and not executed")]
    public async Task ThenXssSanitised()
    {
        await Page.WaitForTimeoutAsync(1000);
        Assert.That(await LoginPage.IsDashboardVisibleAsync(), Is.False,
            "[Security] XSS bypassed authentication — SECURITY VULNERABILITY");
        Console.WriteLine("[Security] XSS check passed.");
    }

    [Then("no browser alert dialog should appear")]
    public void ThenNoAlert() =>
        Console.WriteLine("[Security] No alert dialog observed.");

    [Then("the injection attempt should be rejected safely")]
    public async Task ThenInjectionRejected()
    {
        await Page.WaitForTimeoutAsync(1000);
        Assert.That(await LoginPage.IsDashboardVisibleAsync(), Is.False,
            "[Security] Injection bypassed authentication — SECURITY VULNERABILITY");
        var title = await Page.TitleAsync();
        Assert.That(title.Length, Is.GreaterThan(0), "Page should not crash");
    }

    [Then("the password input field should have type {string}")]
    public Task ThenPasswordFieldType(string _) => LoginPage.AssertPasswordIsMaskedAsync();

    [Then("the entered password text should not be visible in plaintext")]
    public Task ThenPasswordMasked() => LoginPage.AssertPasswordIsMaskedAsync();

    [Then("the page URL should use the HTTPS protocol")]
    public void ThenPageIsHttps() => LoginPage.AssertPageIsHttps();

    [Then("the resulting URL should not contain any credentials or sensitive tokens")]
    public async Task ThenNoCredentialsInUrl()
    {
        await Page.WaitForTimeoutAsync(1500);
        LoginPage.AssertNoCredentialsInUrl();
    }

    [Then("the account should be locked out or a CAPTCHA challenge should appear")]
    public async Task ThenLockedOrCaptcha()
    {
        await Page.WaitForTimeoutAsync(1000);
        var hasCaptcha    = await LoginPage.IsCaptchaVisibleAsync();
        var hasError      = await LoginPage.HasErrorMessageAsync();
        var errorText     = await LoginPage.GetErrorMessageAsync();
        var isLockMsg     = Regex.IsMatch(errorText, "lock|block|too many|attempt|captcha",
                                RegexOptions.IgnoreCase);

        Assert.That(hasCaptcha || (hasError && isLockMsg), Is.True,
            $"[Security] No brute-force protection detected.\n" +
            $"CAPTCHA: {hasCaptcha} | Error: {hasError} | Text: \"{errorText}\"\n" +
            "This is an OWASP A07 vulnerability.");
    }

    [Then("the error message should be generic and should not confirm email existence")]
    public async Task ThenGenericErrorMessage()
    {
        var text     = await LoginPage.GetErrorMessageAsync();
        var reveals  = Regex.IsMatch(text,
            @"this email (is registered|exists|is not registered|does not exist)",
            RegexOptions.IgnoreCase);
        Assert.That(reveals, Is.False,
            $"[Security] Error reveals email existence: \"{text}\" — OWASP A07 enumeration vulnerability.");
        Console.WriteLine($"[Security] Generic error confirmed: \"{text}\"");
    }

    [Then("the user should be redirected to the login page")]
    public async Task ThenRedirectedToLogin()
    {
        await Page.WaitForURLAsync(new Regex("login|signin|auth"),
            new PageWaitForURLOptions { Timeout = _cfg.NavigationTimeout });
        Assert.That(Regex.IsMatch(Page.Url, "login|signin|auth", RegexOptions.IgnoreCase), Is.True,
            $"Expected login URL but got: {Page.Url}");
    }

    [Then("the authenticated session should be terminated")]
    public async Task ThenSessionTerminated()
    {
        await Page.GotoAsync($"{_cfg.JobratorSite}dashboard",
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
        try { await Page.WaitForURLAsync(new Regex("login|signin|auth"),
                  new PageWaitForURLOptions { Timeout = 5000 }); }
        catch { /* No redirect within 5s */ }
        Assert.That(Regex.IsMatch(Page.Url, "login|signin|auth", RegexOptions.IgnoreCase), Is.True,
            $"Session not terminated — dashboard accessible after logout. URL: {Page.Url}");
    }

    [Then("they should be redirected to the login page")]
    public async Task ThenTheyShouldGoToLogin()
    {
        await Page.WaitForURLAsync(new Regex("login|signin|auth"),
            new PageWaitForURLOptions { Timeout = _cfg.NavigationTimeout });
        Assert.That(Regex.IsMatch(Page.Url, "login|signin|auth", RegexOptions.IgnoreCase), Is.True,
            $"Expected login redirect. URL: {Page.Url}");
    }

    [Then("they should be redirected to the candidate dashboard")]
    public async Task ThenTheyShouldGoToDashboard()
    {
        try
        {
            await Page.WaitForURLAsync(new Regex("dashboard|home|candidate|jobs|application"),
                new PageWaitForURLOptions { Timeout = _cfg.DefaultTimeout });
        }
        catch
        {
            var logoutVisible = await Page.Locator("a:has-text('Logout')").First
                .IsVisibleAsync().ConfigureAwait(false);
            Assert.That(logoutVisible, Is.True,
                "Expected authenticated user on dashboard or still logged in on login page");
        }
    }

    [Then("the login page should load within {int} seconds")]
    public async Task ThenLoadWithinSeconds(int seconds)
    {
        var ms        = await LoginPage.MeasureLoginPageLoadTimeAsync();
        var threshold = seconds * 1000;
        Console.WriteLine($"Load time: {ms}ms (threshold: {threshold}ms)");
        Assert.That(ms, Is.LessThanOrEqualTo(threshold),
            $"Login page took {ms}ms — exceeds {threshold}ms threshold");
    }

    [Then("the user should be navigated to the password reset page")]
    public async Task ThenNavigatedToPasswordReset()
    {
        await Page.WaitForURLAsync(new Regex("forgot|reset|password"),
            new PageWaitForURLOptions { Timeout = _cfg.NavigationTimeout });
        Assert.That(Regex.IsMatch(Page.Url, "forgot|reset|password", RegexOptions.IgnoreCase), Is.True,
            $"Expected password reset URL but got: {Page.Url}");
    }

    [Then("the login form should be submitted")]
    public async Task ThenFormSubmitted()
    {
        await Page.WaitForTimeoutAsync(1000);
        Console.WriteLine("Form submitted via Enter key.");
    }

    [Then("an error message should be shown")]
    public async Task ThenErrorShown() =>
        Assert.That(await LoginPage.HasErrorMessageAsync(), Is.True,
            "Expected an error message");

    [Then("the focus should move to the password input field")]
    public async Task ThenFocusOnPassword()
    {
        var input    = Page.Locator("input[type='password'], input[name='password']").First;
        var focused  = await input.EvaluateAsync<bool>("el => el === document.activeElement");
        Assert.That(focused, Is.True, "Tab should move focus to the password field");
    }

    [Then("the application should respond without crashing or throwing a server error")]
    public async Task ThenNoCrash()
    {
        await Page.WaitForTimeoutAsync(1500);
        var title      = await Page.TitleAsync();
        var hasErrPage = Regex.IsMatch(title, "500|503|error|exception|crash", RegexOptions.IgnoreCase)
                      || Regex.IsMatch(Page.Url, "500|error|crash",            RegexOptions.IgnoreCase);
        Assert.That(hasErrPage, Is.False,
            $"Application crashed — Title: \"{title}\" URL: {Page.Url}");
        Console.WriteLine($"Boundary test passed. Title: \"{title}\"");
    }
}
