using Jobrator.E2E.Tests.Pages;
using Jobrator.E2E.Tests.Support;

namespace Jobrator.E2E.Tests.StepDefinitions.Auth;

[Binding]
public sealed class PasswordResetSteps
{
    private readonly ScenarioContext _scenario;
    private readonly EnvConfig       _cfg = EnvConfig.Instance;

    private IPage             Page              => _scenario.Get<PlaywrightDriver>().Page;
    private PasswordResetPage PasswordResetPage => new(Page, _cfg.JobratorSite);
    private LoginPage         LoginPage         => new(Page, _cfg.JobratorSite);
    private RegistrationPage  RegistrationPage  => new(Page, _cfg.JobratorSite);

    public PasswordResetSteps(ScenarioContext scenario) => _scenario = scenario;

    [Given("a new candidate account is registered with a temporary Mailinator email")]
    public async Task GivenNewCandidateRegisteredWithMailinatorEmail()
    {
        var data = TestDataFactory.GenerateCandidate();
        _scenario.Set(data, "PasswordResetCandidate");

        Console.WriteLine($"[PasswordResetSteps] Registering temp candidate: {data.FirstName} {data.LastName} <{data.Email}>");

        await RegistrationPage.NavigateAsync();
        await RegistrationPage.FillAllFieldsAsync(data.FirstName, data.LastName, data.Email, data.Password);
        await RegistrationPage.ClickSubmitAsync();

        // Open Mailinator now and wait for the welcome email — this confirms the account
        // was created and the inbox is reachable before we proceed to the forgot-password flow.
        var mailinatorTab = await PasswordResetPage.OpenMailinatorInboxAsync(data.Email);
        _scenario.Set(mailinatorTab, "MailinatorTab");
        await PasswordResetPage.WaitForWelcomeEmailAsync(mailinatorTab);

        // Return focus to the app tab so subsequent steps interact with Jobrator.
        await Page.BringToFrontAsync();
        Console.WriteLine($"[PasswordResetSteps] Account confirmed. Returned to app tab. URL: {Page.Url}");
    }

    [When("the candidate enters the registered temporary email in the forgot password form")]
    public async Task WhenCandidateEntersTempEmailInForgotForm()
    {
        var data = _scenario.Get<CandidateData>("PasswordResetCandidate");
        await PasswordResetPage.EnterForgotEmailAsync(data.Email);
        Console.WriteLine($"[PasswordResetSteps] Entered email: {data.Email}");
    }

    [When("the candidate submits the forgot password form")]
    public Task WhenCandidateSubmitsForgotForm() =>
        PasswordResetPage.SubmitForgotFormAsync();

    [Then("a confirmation message should be shown on the forgot password page")]
    public async Task ThenConfirmationMessageShouldBeVisible()
    {
        Assert.That(await PasswordResetPage.IsConfirmationVisibleAsync(), Is.True,
            "Expected a confirmation message after submitting the forgot password form");
    }

    [When("the candidate opens the Mailinator inbox in a new tab")]
    public async Task WhenCandidateOpensMailinatorInbox()
    {
        // The tab was already opened during registration — bring it to front to switch to it.
        var mailinatorTab = _scenario.Get<IPage>("MailinatorTab");
        await mailinatorTab.BringToFrontAsync();
        Console.WriteLine("[PasswordResetSteps] Switched to existing Mailinator tab");
    }

    [When("the candidate opens the Jobrator password reset email")]
    public async Task WhenCandidateOpensResetEmail()
    {
        var mailinatorTab = _scenario.Get<IPage>("MailinatorTab");
        await PasswordResetPage.WaitForAndClickResetEmailAsync(mailinatorTab);
    }

    [When("the candidate follows the password reset link in the email")]
    public async Task WhenCandidateFollowsResetLink()
    {
        var mailinatorTab = _scenario.Get<IPage>("MailinatorTab");
        var resetLink     = await PasswordResetPage.ExtractResetLinkAsync(mailinatorTab);
        _scenario.Set(resetLink, "ResetLink");

        await mailinatorTab.CloseAsync();
        await PasswordResetPage.NavigateToResetLinkAsync(resetLink);
    }

    [When("the candidate sets a new password on the reset page")]
    public async Task WhenCandidateSetsNewPassword()
    {
        var newPassword = TestDataFactory.GenerateCandidate().Password;
        _scenario.Set(newPassword, "NewPassword");
        await PasswordResetPage.SetNewPasswordAsync(newPassword);
    }

    [When("the candidate logs in with the new password on the login page")]
    public async Task WhenCandidateLogsInWithNewPassword()
    {
        var data        = _scenario.Get<CandidateData>("PasswordResetCandidate");
        var newPassword = _scenario.Get<string>("NewPassword");

        await LoginPage.NavigateAsync();
        await LoginPage.LoginAsync(data.Email, newPassword);
    }

    [Then("the candidate should be redirected to the dashboard after password reset")]
    public async Task ThenCandidateRedirectedToDashboard()
    {
        await Page.WaitForURLAsync(
            new Regex("dashboard|home|candidate|profile|jobs|application"),
            new PageWaitForURLOptions { Timeout = _cfg.NavigationTimeout });

        Assert.That(
            Regex.IsMatch(Page.Url, "dashboard|home|candidate|profile|jobs|application", RegexOptions.IgnoreCase),
            Is.True,
            $"Expected to land on the dashboard after password reset login, but URL was: {Page.Url}");
    }
}
