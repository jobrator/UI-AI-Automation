using Microsoft.Playwright;
using NUnit.Framework;

namespace Jobrator.E2E.Tests.Pages;

public sealed class LoginPage
{
    private readonly IPage  _page;
    private readonly string _baseUrl;

    private const string EmailInput      = "input[name='email'], input[type='email'], [data-testid='email-input']";
    private const string PasswordInput   = "input[name='password'], input[type='password'], [data-testid='password-input']";
    private const string LoginButton     = "button[type='submit']:has-text('Log in'), button[type='submit']:has-text('Log In'), button[type='submit']:has-text('Login'), [data-testid='login-button']";
    private const string ForgotPassLink  = "[href='/forget-password'], a:has-text('Forget Password?'), a:has-text('Forgot password'), [data-testid='forgot-password-link']";
    private const string LogoutButton    = "a.theme-btn:has-text('Logout'), [data-testid='logout']";
    private const string ErrorMessage    = "[class*='error'], [class*='alert'], [role='alert'], [data-testid='error-message']";
    private const string FieldErrEmail   = "input[name='email'] ~ .error, [data-testid='email-error']";
    private const string FieldErrPass    = "input[name='password'] ~ .error, [data-testid='password-error']";
    private const string DashboardEl     = "[data-testid='dashboard'], .dashboard, [class*='candidate-home']";
    private const string UserMenuEl      = "a:has-text('Logout'), a.upload-cv, [data-testid='user-menu'], .user-avatar";
    private const string CaptchaEl       = ".g-recaptcha, [data-testid='captcha'], iframe[src*='recaptcha'], iframe[src*='hcaptcha']";

    public LoginPage(IPage page, string baseUrl)
    {
        _page    = page;
        _baseUrl = baseUrl.TrimEnd('/');
    }

    public async Task NavigateAsync()
    {
        await _page.GotoAsync($"{_baseUrl}/login",
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });

        if (!await _page.Locator(EmailInput).First.IsVisibleAsync())
        {
            var btn = _page.Locator("button:has-text('Candidate')");
            if (await btn.IsVisibleAsync()) await btn.ClickAsync();
        }

        await _page.Locator(EmailInput).First.WaitForAsync();
    }

    public async Task<bool> IsLoadedAsync() =>
        await _page.Locator(EmailInput).First.IsVisibleAsync();

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

    public async Task ClickLoginButtonAsync() =>
        await _page.Locator(LoginButton).First.ClickAsync();

    public async Task LoginAsync(string email, string password)
    {
        await EnterEmailAsync(email);
        await EnterPasswordAsync(password);
        await ClickLoginButtonAsync();
    }

    public async Task ClearEmailFieldAsync()    => await _page.Locator(EmailInput).First.ClearAsync();
    public async Task ClearPasswordFieldAsync() => await _page.Locator(PasswordInput).First.ClearAsync();
    public async Task ClickForgotPasswordAsync()=> await _page.Locator(ForgotPassLink).First.ClickAsync();
    public async Task LogoutAsync()             => await _page.Locator(LogoutButton).First.ClickAsync();

    public async Task AttemptLoginMultipleTimesAsync(string email, string wrongPassword, int attempts)
    {
        for (int i = 0; i < attempts; i++)
        {
            Console.WriteLine($"[LoginPage] Brute-force attempt {i + 1}/{attempts}");
            await EnterEmailAsync(email);
            await EnterPasswordAsync(wrongPassword);
            await ClickLoginButtonAsync();
            await _page.WaitForTimeoutAsync(800);
        }
    }

    private async Task<string> TextOrEmptyAsync(string selector)
    {
        var loc = _page.Locator(selector).First;
        return await loc.IsVisibleAsync() ? await loc.InnerTextAsync() : string.Empty;
    }

    public Task<string> GetErrorMessageAsync()      => TextOrEmptyAsync(ErrorMessage);
    public Task<string> GetEmailFieldErrorAsync()   => TextOrEmptyAsync(FieldErrEmail);
    public Task<string> GetPasswordFieldErrorAsync()=> TextOrEmptyAsync(FieldErrPass);

    public Task<bool> HasErrorMessageAsync()           => _page.Locator(ErrorMessage).First.IsVisibleAsync();
    public Task<bool> IsDashboardVisibleAsync()        => _page.Locator(DashboardEl).First.IsVisibleAsync();
    public Task<bool> IsUserMenuVisibleAsync()         => _page.Locator(UserMenuEl).First.IsVisibleAsync();
    public Task<bool> IsForgotPasswordLinkVisibleAsync()=> _page.Locator(ForgotPassLink).First.IsVisibleAsync();
    public Task<bool> IsCaptchaVisibleAsync()          => _page.Locator(CaptchaEl).First.IsVisibleAsync();

    public Task<string?> GetPasswordInputTypeAsync() =>
        _page.Locator(PasswordInput).First.GetAttributeAsync("type");

    public bool IsOnLoginPage()
    {
        var url = _page.Url;
        return url.Contains("/login") || url.Contains("/signin") || url.Contains("/auth");
    }

    public void AssertPageIsHttps() =>
        Assert.That(_page.Url, Does.StartWith("https://"), "Login page must be served over HTTPS");

    public void AssertNoCredentialsInUrl()
    {
        var url = _page.Url.ToLower();
        foreach (var kw in new[] { "password", "passwd", "secret", "token", "credential" })
            Assert.That(url, Does.Not.Contain(kw),
                $"URL must not contain sensitive data: '{kw}' found in {_page.Url}");
    }

    public async Task AssertPasswordIsMaskedAsync()
    {
        var type = await GetPasswordInputTypeAsync();
        Assert.That(type, Is.EqualTo("password"), "Password field must have type='password'");
    }

    public async Task<long> MeasureLoginPageLoadTimeAsync()
    {
        var start = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        await _page.GotoAsync($"{_baseUrl}/login",
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
        await _page.Locator(EmailInput).First.WaitForAsync();
        return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - start;
    }
}
