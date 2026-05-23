using System.Text.RegularExpressions;
using Jobrator.E2E.Tests.Pages;
using Jobrator.E2E.Tests.Support;
using Microsoft.Playwright;
using NUnit.Framework;
using Reqnroll;

namespace Jobrator.E2E.Tests.StepDefinitions.Auth;

[Binding]
public sealed class RegistrationSteps
{
    private readonly ScenarioContext _scenario;
    private readonly EnvConfig       _cfg = EnvConfig.Instance;

    private IPage            Page             => _scenario.Get<PlaywrightDriver>().Page;
    private RegistrationPage RegistrationPage => new(Page, _cfg.JobratorSite);

    private bool _xssDialogSeen;

    public RegistrationSteps(ScenarioContext scenario) => _scenario = scenario;

    [Given("the Jobrator registration page is open")]
    public async Task GivenRegistrationPageIsOpen()
    {
        await RegistrationPage.NavigateAsync();
        Assert.That(await RegistrationPage.IsLoadedAsync(), Is.True,
            "Registration page failed to load — email input not found");
    }

    [When("the user fills in the registration form with random valid data")]
    public async Task WhenUserFillsRandomValidData()
    {
        var data = TestDataFactory.GenerateCandidate();
        _scenario.Set(data, "CandidateData");

        Console.WriteLine($"[RegistrationSteps] Generated candidate: {data.FirstName} {data.LastName} <{data.Email}>");

        await RegistrationPage.FillAllFieldsAsync(
            data.FirstName, data.LastName, data.Email, data.Password);
    }

    [When("the user fills in the registration form with a known registered email")]
    public async Task WhenUserFillsWithKnownRegisteredEmail()
    {
        var data = TestDataFactory.GenerateCandidate() with { Email = _cfg.CandidateEmail };
        _scenario.Set(data, "CandidateData");

        Console.WriteLine($"[RegistrationSteps] Using existing email: {data.Email}");

        await RegistrationPage.FillAllFieldsAsync(
            data.FirstName, data.LastName, data.Email, data.Password);
    }

    [When("the user submits the registration form")]
    public Task WhenUserSubmitsForm() => RegistrationPage.ClickSubmitAsync();

    [When("the user submits the registration form without filling any fields")]
    public async Task WhenUserSubmitsEmptyForm()
    {
        await RegistrationPage.CheckTermsAsync();
        await RegistrationPage.ClickSubmitAsync();
    }

    [When("the user enters a mismatched confirmation password")]
    public async Task WhenUserEntersMismatchedConfirmPassword()
    {
        var data = _scenario.Get<CandidateData>("CandidateData");
        await RegistrationPage.EnterConfirmPasswordAsync(data.Password + "_MISMATCH");
    }

    [When("the user overrides the email with an invalid value {string}")]
    public Task WhenUserOverridesEmail(string invalidEmail) =>
        RegistrationPage.EnterEmailAsync(invalidEmail);

    [When("the user overrides the password with a too-short value {string}")]
    public async Task WhenUserOverridesPasswordShort(string shortPassword)
    {
        await RegistrationPage.EnterPasswordAsync(shortPassword);
        await RegistrationPage.EnterConfirmPasswordAsync(shortPassword);
    }

    [When("the user overrides the password with a plain value {string}")]
    public async Task WhenUserOverridesPasswordPlain(string plainPassword)
    {
        await RegistrationPage.EnterPasswordAsync(plainPassword);
        await RegistrationPage.EnterConfirmPasswordAsync(plainPassword);
    }

    [When("the user fills in the registration form with the XSS payload {string} in the first name")]
    public async Task WhenUserEntersXssInFirstName(string xssPayload)
    {
        var data = TestDataFactory.GenerateCandidate();
        _scenario.Set(data, "CandidateData");

        Page.Dialog += async (_, dialog) =>
        {
            _xssDialogSeen = true;
            await dialog.DismissAsync();
        };

        Console.WriteLine($"[RegistrationSteps] XSS test — first name payload: {xssPayload}");

        await RegistrationPage.EnterFirstNameAsync(xssPayload);
        await RegistrationPage.EnterLastNameAsync(data.LastName);
        await RegistrationPage.EnterEmailAsync(data.Email);
        await RegistrationPage.EnterPasswordAsync(data.Password);
        await RegistrationPage.EnterConfirmPasswordAsync(data.Password);
        await RegistrationPage.CheckTermsAsync();
    }

    [When("the user clicks the login link on the registration page")]
    public Task WhenUserClicksLoginLink() => RegistrationPage.ClickLoginLinkAsync();

    [Then("the registration should be successful")]
    public async Task ThenRegistrationShouldBeSuccessful()
    {
        bool redirected = false;
        try
        {
            await Page.WaitForURLAsync(
                url => !url.Contains("/register") && !url.Contains("/signup"),
                new PageWaitForURLOptions { Timeout = _cfg.NavigationTimeout });
            redirected = true;
        }
        catch { }

        if (redirected)
        {
            Assert.That(Page.Url, Does.Not.Contain("/register"),
                $"Registration was not successful. Current URL: {Page.Url}");
            return;
        }

        var inlineSuccess = await RegistrationPage.IsRegistrationSuccessfulAsync();
        Assert.That(inlineSuccess, Is.True,
            $"Registration was not successful. Current URL: {Page.Url}");
    }

    [Then("a registration error message should be displayed")]
    public async Task ThenRegistrationErrorShouldBeDisplayed()
    {
        await Page.Locator("[class*='error'], [class*='alert'], [role='alert'], [data-testid='error-message']")
                  .First
                  .WaitForAsync(new LocatorWaitForOptions { Timeout = _cfg.ExpectTimeout });

        Assert.That(await RegistrationPage.HasErrorMessageAsync(), Is.True,
            "Expected a registration error message but none was visible");
    }

    [Then("the user should remain on the registration page")]
    public void ThenUserShouldRemainOnRegistrationPage() =>
        Assert.That(RegistrationPage.IsOnRegistrationPage(), Is.True,
            $"Expected to stay on the registration page but current URL is: {Page.Url}");

    [Then("the first name input field should be visible")]
    public async Task ThenFirstNameInputVisible() =>
        Assert.That(await RegistrationPage.IsFirstNameInputVisibleAsync(), Is.True,
            "First name input is not visible on the registration page");

    [Then("the last name input field should be visible")]
    public async Task ThenLastNameInputVisible() =>
        Assert.That(await RegistrationPage.IsLastNameInputVisibleAsync(), Is.True,
            "Last name input is not visible on the registration page");

    [Then("the registration email input field should be visible")]
    public async Task ThenEmailInputVisible() =>
        Assert.That(await RegistrationPage.IsEmailInputVisibleAsync(), Is.True,
            "Email input is not visible on the registration page");

    [Then("the registration password input field should be visible")]
    public async Task ThenPasswordInputVisible() =>
        Assert.That(await RegistrationPage.IsPasswordInputVisibleAsync(), Is.True,
            "Password input is not visible on the registration page");

    [Then("the confirm password input field should be visible")]
    public async Task ThenConfirmPasswordInputVisible() =>
        Assert.That(await RegistrationPage.IsConfirmPasswordInputVisibleAsync(), Is.True,
            "Confirm password input is not visible on the registration page");

    [Then("the registration submit button should be visible")]
    public async Task ThenSubmitButtonVisible() =>
        Assert.That(await RegistrationPage.IsSubmitButtonVisibleAsync(), Is.True,
            "Submit button is not visible on the registration page");

    [Then("the login link should be visible on the registration page")]
    public async Task ThenLoginLinkVisible() =>
        Assert.That(await RegistrationPage.IsLoginLinkVisibleAsync(), Is.True,
            "Login link is not visible on the registration page");

    [Then("the registration password field should be of type password")]
    public async Task ThenPasswordFieldIsMasked()
    {
        var type = await RegistrationPage.GetPasswordInputTypeAsync();
        Assert.That(type, Is.EqualTo("password"), "Password field must have type='password'");
    }

    [Then("the confirm password field should be of type password")]
    public async Task ThenConfirmPasswordFieldIsMasked()
    {
        var type = await RegistrationPage.GetConfirmPasswordInputTypeAsync();
        Assert.That(type, Is.EqualTo("password"), "Confirm password field must have type='password'");
    }

    [Then("the registration page should be served over HTTPS")]
    public void ThenPageIsHttps() => RegistrationPage.AssertPageIsHttps();

    [Then("the XSS script should not have executed")]
    public void ThenXssScriptDidNotExecute() =>
        Assert.That(_xssDialogSeen, Is.False,
            "XSS script executed — a JavaScript dialog was triggered by the payload");

    [Then("the login page should be displayed")]
    public async Task ThenLoginPageIsDisplayed()
    {
        var loginEmailInput = Page.Locator("input[name='email'], input[type='email']").First;
        await loginEmailInput.WaitForAsync(new LocatorWaitForOptions { Timeout = _cfg.ExpectTimeout });
        Assert.That(await loginEmailInput.IsVisibleAsync(), Is.True,
            $"Expected the login form to be visible. Current URL: {Page.Url}");
    }
}
