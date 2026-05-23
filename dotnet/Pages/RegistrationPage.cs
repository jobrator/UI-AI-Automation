using Microsoft.Playwright;
using NUnit.Framework;

namespace Jobrator.E2E.Tests.Pages;

public sealed class RegistrationPage
{
    private readonly IPage  _page;
    private readonly string _baseUrl;

    private const string RegisterTrigger  = "a.call-modal:has-text('Register')";
    private const string FirstNameInput   = "input[name='candidateFirstName']";
    private const string LastNameInput    = "input[name='candidateLastName']";
    private const string EmailInput       = "input[name='candidateEmail']";
    private const string PasswordInput    = "input[name='candidatePassword']";
    private const string ConfirmPassInput = "input[name='candidateConfirmPassword']";
    private const string TermsCheckbox    = "input[name='checkbox-ready']";
    private const string SubmitButton     = "button[type='submit'][form='candidateRegister']";
    private const string ErrorMessage     = "[class*='error'], [class*='alert'], [role='alert'], [data-testid='error-message']";
    private const string SuccessIndicator = "[data-testid='registration-success'], [class*='success'], [class*='verify']";
    private const string DashboardEl      = "[data-testid='dashboard'], .dashboard, [class*='candidate-home']";
    private const string LoginLink        = "a.call-modal.login";

    public RegistrationPage(IPage page, string baseUrl)
    {
        _page    = page;
        _baseUrl = baseUrl.TrimEnd('/');
    }

    public async Task NavigateAsync()
    {
        await _page.GotoAsync($"{_baseUrl}/login",
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });

        await _page.Locator(RegisterTrigger).First.ClickAsync();

        await _page.Locator(FirstNameInput).First.WaitForAsync(
            new LocatorWaitForOptions { Timeout = 15000 });
    }

    public async Task<bool> IsLoadedAsync() =>
        await _page.Locator(FirstNameInput).First.IsVisibleAsync();

    public async Task EnterFirstNameAsync(string firstName)
    {
        var loc = _page.Locator(FirstNameInput).First;
        await loc.ClearAsync();
        await loc.FillAsync(firstName);
    }

    public async Task EnterLastNameAsync(string lastName)
    {
        var loc = _page.Locator(LastNameInput).First;
        await loc.ClearAsync();
        await loc.FillAsync(lastName);
    }

    public async Task EnterEmailAsync(string email)
    {
        var loc = _page.Locator(EmailInput).First;
        await loc.ClearAsync();
        await loc.FillAsync(email);
    }

    public async Task EnterPasswordAsync(string password)
    {
        var loc = _page.Locator(PasswordInput).First;
        await loc.ClearAsync();
        await loc.FillAsync(password);
    }

    public async Task EnterConfirmPasswordAsync(string confirmPassword)
    {
        var loc = _page.Locator(ConfirmPassInput).First;
        await loc.ClearAsync();
        await loc.FillAsync(confirmPassword);
    }

    public async Task CheckTermsAsync()
    {
        await _page.Locator("label[for='checkbox-ready']").First.ClickAsync();
    }

    public async Task ClickSubmitAsync() =>
        await _page.Locator(SubmitButton).First.ClickAsync();

    public async Task FillAllFieldsAsync(string firstName, string lastName, string email, string password)
    {
        await EnterFirstNameAsync(firstName);
        await EnterLastNameAsync(lastName);
        await EnterEmailAsync(email);
        await EnterPasswordAsync(password);
        await EnterConfirmPasswordAsync(password);
        await CheckTermsAsync();
    }

    public async Task ClickLoginLinkAsync() =>
        await _page.Locator(LoginLink).First.ClickAsync();

    public Task<bool> IsFirstNameInputVisibleAsync()      => _page.Locator(FirstNameInput).First.IsVisibleAsync();
    public Task<bool> IsLastNameInputVisibleAsync()       => _page.Locator(LastNameInput).First.IsVisibleAsync();
    public Task<bool> IsEmailInputVisibleAsync()          => _page.Locator(EmailInput).First.IsVisibleAsync();
    public Task<bool> IsPasswordInputVisibleAsync()       => _page.Locator(PasswordInput).First.IsVisibleAsync();
    public Task<bool> IsConfirmPasswordInputVisibleAsync()=> _page.Locator(ConfirmPassInput).First.IsVisibleAsync();
    public Task<bool> IsSubmitButtonVisibleAsync()        => _page.Locator(SubmitButton).First.IsVisibleAsync();
    public Task<bool> IsLoginLinkVisibleAsync()           => _page.Locator(LoginLink).First.IsVisibleAsync();
    public Task<bool> HasErrorMessageAsync()              => _page.Locator(ErrorMessage).First.IsVisibleAsync();

    public async Task<string> GetErrorMessageTextAsync()
    {
        var loc = _page.Locator(ErrorMessage).First;
        return await loc.IsVisibleAsync() ? await loc.InnerTextAsync() : string.Empty;
    }

    public async Task<bool> IsRegistrationSuccessfulAsync()
    {
        var url = _page.Url.ToLower();
        if (url.Contains("dashboard") || url.Contains("verify") ||
            url.Contains("success")   || url.Contains("home"))
            return true;

        return await _page.Locator(SuccessIndicator).First.IsVisibleAsync() ||
               await _page.Locator(DashboardEl).First.IsVisibleAsync();
    }

    public bool IsOnRegistrationPage() => _page.Url.Contains("/register");

    public Task<string?> GetPasswordInputTypeAsync() =>
        _page.Locator(PasswordInput).First.GetAttributeAsync("type");

    public Task<string?> GetConfirmPasswordInputTypeAsync() =>
        _page.Locator(ConfirmPassInput).First.GetAttributeAsync("type");

    public void AssertPageIsHttps() =>
        Assert.That(_page.Url, Does.StartWith("https://"), "Registration page must be served over HTTPS");
}
