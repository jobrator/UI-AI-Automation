using Jobrator.E2E.Tests.Support;

namespace Jobrator.E2E.Tests.Pages;

public sealed class PasswordResetPage
{
    private readonly IPage  _page;
    private readonly string _baseUrl;

    // Forgot-password page
    private const string ForgotEmailInput = "input[name='email'], input[type='email'], [data-testid='reset-email-input']";
    private const string ForgotSubmitBtn  = "button[type='submit'], [data-testid='reset-submit']";
    private const string ConfirmationMsg  = "[class*='success'], [class*='alert-success'], [data-testid='reset-confirmation'], " +
                                            "p:has-text('reset'), p:has-text('sent'), p:has-text('email'), " +
                                            "[class*='message']:has-text('reset'), [class*='message']:has-text('sent')";

    // Reset-password form
    private const string NewPasswordInput  = "input[name='password'], input[name='newPassword'], input[type='password'], [data-testid='new-password']";
    private const string ConfirmPassInput  = "input[name='password_confirmation'], input[name='confirmPassword'], " +
                                             "input[name='confirm_password'], [data-testid='confirm-password']";
    private const string ResetSubmitBtn    = "button[type='submit'], [data-testid='reset-password-btn']";

    // Mailinator
    private const string MailinatorBase    = "https://www.mailinator.com/v4/public/inboxes.jsp?to=";
    private const string MailinatorRow     = "tr.ng-scope";
    private const string MailinatorIframe  = "#msg_body";
    private const string EmailResetLink    = "a[href*='reset'], a[href*='password'], a[href*='token'], a:has-text('Reset Password'), a:has-text('Click here')";

    public PasswordResetPage(IPage page, string baseUrl)
    {
        _page    = page;
        _baseUrl = baseUrl.TrimEnd('/');
    }

    public async Task EnterForgotEmailAsync(string email)
    {
        var loc = _page.Locator(ForgotEmailInput).First;
        await loc.WaitForAsync(new LocatorWaitForOptions { Timeout = 10000 });
        await loc.ClearAsync();
        await loc.FillAsync(email);
    }

    public async Task SubmitForgotFormAsync() =>
        await _page.Locator(ForgotSubmitBtn).First.ClickAsync();

    public async Task<bool> IsConfirmationVisibleAsync()
    {
        await _page.WaitForTimeoutAsync(2000);
        return await _page.Locator(ConfirmationMsg).First.IsVisibleAsync();
    }

    public async Task<IPage> OpenMailinatorInboxAsync(string email)
    {
        var inbox   = Uri.EscapeDataString(email.Split('@')[0]);
        var newPage = await _page.Context.NewPageAsync();
        await newPage.GotoAsync($"{MailinatorBase}{inbox}",
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded, Timeout = 30000 });
        Console.WriteLine($"[PasswordResetPage] Opened Mailinator tab for inbox: {email.Split('@')[0]}");
        return newPage;
    }

    // Poll until ANY email row appears (used after registration to confirm welcome email arrived).
    public async Task WaitForWelcomeEmailAsync(IPage mailinatorPage)
    {
        for (int i = 0; i < 12; i++)
        {
            await mailinatorPage.ReloadAsync(new PageReloadOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
            await mailinatorPage.WaitForTimeoutAsync(5000);

            if (await mailinatorPage.Locator(MailinatorRow).First.IsVisibleAsync())
            {
                Console.WriteLine("[PasswordResetPage] Welcome email confirmed in Mailinator inbox");
                return;
            }

            Console.WriteLine($"[PasswordResetPage] Waiting for welcome email... attempt {i + 1}/12");
        }

        Console.WriteLine("[PasswordResetPage] Warning: no welcome email found — proceeding anyway");
    }

    // Wait until the inbox grows beyond the welcome email (count >= 2), then click
    // the first/newest row — which will be the reset email since it arrives later.
    // This avoids subject-text guessing entirely.
    public async Task WaitForAndClickResetEmailAsync(IPage mailinatorPage)
    {
        var inboxUrl = mailinatorPage.Url;

        for (int i = 0; i < 12; i++)
        {
            // Use GotoAsync (fresh navigation) with NetworkIdle so Angular has time to render.
            await mailinatorPage.GotoAsync(inboxUrl,
                new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle, Timeout = 30000 });
            await mailinatorPage.WaitForTimeoutAsync(3000);

            var title = await mailinatorPage.TitleAsync();
            var url   = mailinatorPage.Url;

            // Try both the Angular-scoped row selector and a plain table-row fallback.
            var count = await mailinatorPage.Locator($"{MailinatorRow}, table tbody tr").CountAsync();
            Console.WriteLine($"[PasswordResetPage] Attempt {i + 1}/12 — {count} row(s) — title: '{title}' — url: {url}");

            if (count >= 2)
            {
                // First row = newest email = the password reset email (welcome email arrived earlier).
                await mailinatorPage.Locator($"{MailinatorRow}, table tbody tr").First.ClickAsync();
                await mailinatorPage.WaitForTimeoutAsync(2000);
                Console.WriteLine("[PasswordResetPage] Clicked newest email (password reset)");
                return;
            }
        }

        Assert.Fail("Password reset email did not arrive in the Mailinator inbox within 60 seconds");
    }

    public async Task<string> ExtractResetLinkAsync(IPage mailinatorPage)
    {
        // Give the email panel time to fully render
        await mailinatorPage.WaitForTimeoutAsync(4000);

        // 1. Walk every frame on the page (covers any iframe Mailinator uses)
        foreach (var frame in mailinatorPage.Frames)
        {
            try
            {
                var anchors = await frame.QuerySelectorAllAsync("a");
                foreach (var anchor in anchors)
                {
                    var href = await anchor.GetAttributeAsync("href");
                    if (!string.IsNullOrEmpty(href) &&
                        (href.Contains("reset", StringComparison.OrdinalIgnoreCase)   ||
                         href.Contains("password", StringComparison.OrdinalIgnoreCase)||
                         href.Contains("token", StringComparison.OrdinalIgnoreCase)))
                    {
                        Console.WriteLine($"[PasswordResetPage] Reset link found in frame '{frame.Name}': {href}");
                        return href;
                    }
                }
            }
            catch { /* frame may be cross-origin — skip */ }
        }

        // 2. Fallback: evaluate JS on the main frame to collect all hrefs
        var jsResult = await mailinatorPage.EvaluateAsync<string?>(@"() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            const match = anchors.find(a => {
                const h = (a.getAttribute('href') || '').toLowerCase();
                return h.includes('reset') || h.includes('password') || h.includes('token');
            });
            return match ? match.getAttribute('href') : null;
        }");

        if (!string.IsNullOrEmpty(jsResult))
        {
            Console.WriteLine($"[PasswordResetPage] Reset link found via JS fallback: {jsResult}");
            return jsResult;
        }

        Assert.Fail("Could not find a password reset link in the Mailinator email — " +
                    "checked all frames and page JS.");
        return string.Empty;
    }

    public async Task NavigateToResetLinkAsync(string resetLink)
    {
        await _page.GotoAsync(resetLink,
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded, Timeout = 30000 });
        await _page.Locator(NewPasswordInput).First.WaitForAsync(
            new LocatorWaitForOptions { Timeout = 15000 });
    }

    public async Task SetNewPasswordAsync(string newPassword)
    {
        var newPwd = _page.Locator(NewPasswordInput).First;
        await newPwd.ClearAsync();
        await newPwd.FillAsync(newPassword);

        var confirm = _page.Locator(ConfirmPassInput).First;
        if (await confirm.IsVisibleAsync())
        {
            await confirm.ClearAsync();
            await confirm.FillAsync(newPassword);
        }

        await _page.Locator(ResetSubmitBtn).First.ClickAsync();
        await _page.WaitForTimeoutAsync(2000);
        Console.WriteLine("[PasswordResetPage] New password submitted");
    }
}
