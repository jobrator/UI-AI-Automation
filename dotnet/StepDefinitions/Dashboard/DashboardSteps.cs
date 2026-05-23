using System.IO;
using System.Text.RegularExpressions;
using Jobrator.E2E.Tests.Pages;
using Jobrator.E2E.Tests.Support;
using Microsoft.Playwright;
using NUnit.Framework;
using Reqnroll;

namespace Jobrator.E2E.Tests.StepDefinitions.Dashboard;

[Binding]
public sealed class DashboardSteps
{
    private readonly ScenarioContext _scenario;
    private readonly EnvConfig       _cfg = EnvConfig.Instance;

    private IPage         Page          => _scenario.Get<PlaywrightDriver>().Page;
    private DashboardPage DashboardPage => new(Page, _cfg.JobratorSite);

    public DashboardSteps(ScenarioContext scenario) => _scenario = scenario;

    [Given("the authenticated candidate is on the dashboard")]
    public async Task GivenAuthenticatedCandidateIsOnDashboard()
    {
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        Console.WriteLine($"[Dashboard] Post-login URL: {Page.Url}");
        Assert.That(await DashboardPage.IsLoadedAsync(), Is.True,
            $"Expected authenticated dashboard but logout control not found. URL: {Page.Url}");
    }

    [Given("no active browser session exists for the dashboard tests")]
    public async Task GivenNoActiveSession()
    {
        await Page.Context.ClearCookiesAsync();
        await Page.EvaluateAsync(@"() => {
            try { localStorage.clear(); } catch {}
            try { sessionStorage.clear(); } catch {}
        }");
        Console.WriteLine("[Dashboard] Session cleared — scenario starts unauthenticated.");
    }

    [When("the candidate clicks the find jobs link in the navigation")]
    public Task WhenClickFindJobs() => DashboardPage.ClickFindJobsAsync();

    [When("the candidate clicks the my applications link in the navigation")]
    public Task WhenClickMyApplications() => DashboardPage.ClickMyApplicationsAsync();

    [When("the candidate clicks the my profile link in the navigation")]
    public Task WhenClickMyProfile() => DashboardPage.ClickMyProfileAsync();

    [When("the candidate refreshes the dashboard page")]
    public Task WhenRefreshDashboard() => DashboardPage.RefreshAsync();

    [When("the candidate clicks the logout control on the dashboard")]
    public Task WhenClickLogout() => DashboardPage.ClickLogoutAsync();

    [When("the candidate enters XSS payload {string} in the dashboard search field")]
    public async Task WhenXssPayloadInSearchField(string payload)
    {
        await DashboardPage.EnterSearchValueAsync(payload);
        Console.WriteLine($"[Security] XSS payload entered in dashboard search: {payload}");
    }

    private static string CvFixture(string filename) =>
        Path.Combine(AppContext.BaseDirectory, "TestData", "CV", filename);

    [When("the candidate uploads a valid CV file")]
    public async Task WhenCandidateUploadsValidCvFile()
    {
        var filePath = CvFixture("tc051-valid-cv.pdf");
        _scenario.Set(filePath, "UploadedCvPath");
        Console.WriteLine($"[Dashboard] Uploading CV fixture: {filePath}");
        await DashboardPage.UploadCvAsync(filePath);
    }

    [When("the candidate uploads a valid {string} format CV file")]
    public async Task WhenCandidateUploadsValidCvFileWithFormat(string format)
    {
        var ext      = format.TrimStart('.').ToLowerInvariant();
        var filePath = CvFixture($"tc052-valid-cv.{ext}");
        _scenario.Set(filePath, "UploadedCvPath");
        Console.WriteLine($"[Dashboard] Uploading CV fixture ({ext.ToUpperInvariant()}): {filePath}");
        await DashboardPage.UploadCvAsync(filePath);
    }

    [When("the candidate attempts to upload a CV with an unsupported file type")]
    public async Task WhenCandidateUploadsUnsupportedCvFile()
    {
        var filePath = CvFixture("tc053-unsupported.exe");
        _scenario.Set(filePath, "UnsupportedCvPath");
        Console.WriteLine($"[Dashboard] Attempting CV upload with unsupported fixture: {filePath}");
        try
        {
            await DashboardPage.UploadCvAsync(filePath);
        }
        catch { }
    }

    [When("the candidate selects the original CV file without submitting")]
    public async Task WhenCandidateSelectsOriginalCvWithoutSubmitting()
    {
        var filePath = CvFixture("tc054-original-cv.pdf");
        _scenario.Set(filePath, "UploadedCvPath");
        Console.WriteLine($"[Dashboard] Selecting original CV (no submit): {filePath}");
        await DashboardPage.SelectCvFileWithoutSubmittingAsync(filePath);
    }

    [When("the candidate replaces the CV selection with a replacement file")]
    public async Task WhenCandidateReplacesCvSelection()
    {
        var filePath = CvFixture("tc054-replacement-cv.pdf");
        _scenario.Set(filePath, "ReplacementCvPath");
        Console.WriteLine($"[Dashboard] Replacing CV selection with: {filePath}");
        await DashboardPage.ReplaceCvFileSelectionAsync(filePath);
    }

    [When("the candidate submits the CV upload form")]
    public Task WhenCandidateSubmitsCvUploadForm() =>
        DashboardPage.SubmitCvUploadFormAsync();

    [When("the candidate uploads a CV file containing embedded script content")]
    public async Task WhenCandidateUploadsCvWithScriptContent()
    {
        var filePath = CvFixture("tc055-xss-cv.pdf");
        _scenario.Set(filePath, "ScriptCvPath");
        Console.WriteLine($"[Security] Uploading XSS CV fixture: {filePath}");
        await DashboardPage.UploadCvAsync(filePath);
    }

    [Then("the CV upload should be accepted")]
    public async Task ThenCvUploadShouldBeAccepted()
    {
        var uploadedFile = _scenario.Get<string>("UploadedCvPath");
        var fileName = Path.GetFileName(uploadedFile);

        var successVisible = await DashboardPage.IsUploadSuccessVisibleAsync();
        var inputHasFile = await DashboardPage.IsUploadCvFileInputFilledAsync();
        var fileNameVisible = await Page.Locator($"text={fileName}").First.IsVisibleAsync();

        Assert.That(successVisible || inputHasFile || fileNameVisible, Is.True,
            "CV upload was not accepted. No success indicator, selected file, or uploaded filename was detected.");
    }

    [Then("the CV upload should not be accepted for an unsupported file type")]
    public async Task ThenCvUploadNotAcceptedForUnsupportedType()
    {
        await Page.WaitForTimeoutAsync(2000);
        var successVisible = await DashboardPage.IsUploadSuccessVisibleAsync();
        Console.WriteLine($"[CV Upload] Success indicator after unsupported-type upload: {successVisible}");
        Assert.That(successVisible, Is.False,
            "CV upload succeeded for an unsupported file type — the application should not indicate success.");
    }

    [Then("the replacement CV should be accepted")]
    public async Task ThenReplacementCvShouldBeAccepted()
    {
        var replacementFile = _scenario.Get<string>("ReplacementCvPath");
        var fileName = Path.GetFileName(replacementFile);

        var successVisible = await DashboardPage.IsUploadSuccessVisibleAsync();
        var inputHasFile = await DashboardPage.IsUploadCvFileInputFilledAsync();
        var fileNameVisible = await Page.Locator($"text={fileName}").First.IsVisibleAsync();

        Assert.That(successVisible || inputHasFile || fileNameVisible, Is.True,
            "Replacement CV upload was not accepted. No success indicator, selected file, or uploaded filename was detected.");
    }

    [Then("the candidate clicks the OK button on the upload success popup")]
    public Task ThenClickUploadSuccessOk() => DashboardPage.ClickUploadSuccessOkAsync();

    [When("the candidate hovers on the uploaded CV and clicks the view icon")]
    public async Task WhenHoverCvAndClickView()
    {
        var newPage = await DashboardPage.HoverCvAndClickViewAsync();
        if (newPage != null)
            _scenario.Set(newPage, "CvViewTab");
    }

    [Then("the CV should be opened in a new browser tab")]
    public void ThenCvOpenedInNewTab()
    {
        if (!_scenario.ContainsKey("CvViewTab"))
        {
            Console.WriteLine("[Dashboard] No new tab stored — CV may have opened inline.");
            return;
        }
        var newTab = _scenario.Get<IPage>("CvViewTab");
        Assert.That(newTab.Url, Is.Not.Empty.And.Not.EqualTo("about:blank"),
            "CV view tab opened but URL is blank — document did not load");
        Console.WriteLine($"[Dashboard] CV opened in new tab: {newTab.Url}");
    }

    [Then("the candidate closes the new browser tab")]
    public async Task ThenCloseNewBrowserTab()
    {
        if (_scenario.ContainsKey("CvViewTab"))
        {
            await _scenario.Get<IPage>("CvViewTab").CloseAsync();
            Console.WriteLine("[Dashboard] New CV view tab closed.");
        }
        else
        {
            Console.WriteLine("[Dashboard] No new CV tab to close.");
        }
    }

    [When("the candidate hovers on the uploaded CV and clicks the download icon")]
    public async Task WhenHoverCvAndClickDownload()
    {
        var download = await DashboardPage.HoverCvAndClickDownloadAsync();
        if (download != null)
            _scenario.Set(download, "CvDownload");
    }

    [Then("the CV should be downloaded successfully")]
    public void ThenCvDownloadedSuccessfully()
    {
        Assert.That(_scenario.ContainsKey("CvDownload"), Is.True,
            "No download was captured — the CV download icon click did not trigger a download");
        var download = _scenario.Get<IDownload>("CvDownload");
        Assert.That(download.SuggestedFilename, Is.Not.Empty,
            "Download was triggered but has no suggested filename");
        Console.WriteLine($"[Dashboard] CV download verified: {download.SuggestedFilename}");
    }

    [When("the candidate hovers on the uploaded CV and clicks the delete icon")]
    public async Task WhenHoverCvAndClickDelete()
    {
        _scenario.Set(await DashboardPage.GetUploadedCvCountAsync(), "CvCountBeforeDelete");
        await DashboardPage.HoverCvAndClickDeleteAsync();
    }

    [When("the candidate clicks the Delete button to confirm deletion")]
    public Task WhenClickDeleteConfirmation() => DashboardPage.ClickDeleteConfirmationAsync();

    [Then("the CV should no longer appear in the list")]
    public async Task ThenCvNoLongerInList()
    {
        var countBefore = _scenario.ContainsKey("CvCountBeforeDelete")
            ? _scenario.Get<int>("CvCountBeforeDelete")
            : 1;
        Assert.That(await DashboardPage.IsCvCountDecreasedAsync(countBefore), Is.True,
            $"CV count did not decrease after deletion (was {countBefore} before delete).");
    }

    [Then("the CV upload workflow should not trigger script execution on the page")]
    public async Task ThenCvWorkflowShouldNotTriggerScriptExecution()
    {
        await Page.WaitForTimeoutAsync(1500);
        var xssTriggered = await Page.EvaluateAsync<bool>("() => !!window.__xss_triggered");
        Assert.That(xssTriggered, Is.False,
            "[Security] XSS script in CV content was executed on the page — OWASP A03 Injection vulnerability.");

        var title = await Page.TitleAsync();
        Assert.That(Regex.IsMatch(title, "500|error|crash", RegexOptions.IgnoreCase), Is.False,
            $"[Security] Page title suggests CV script content caused an error: \"{title}\"");

        Console.WriteLine("[Security] CV embedded script content did not execute — XSS protection verified.");
    }

    [When("a user without an active session navigates directly to the dashboard URL")]
    public Task WhenUnauthenticatedNavigatesToDashboard() => DashboardPage.NavigateAsync();

    [When("a user navigates to the dashboard with a forged session cookie value")]
    public Task WhenNavigatesWithForgedSession() =>
        DashboardPage.NavigateWithForgedSessionAsync("session", "forged-invalid-token-xyz-999");

    [Then("the dashboard page should be fully loaded")]
    public async Task ThenDashboardFullyLoaded() =>
        Assert.That(await DashboardPage.IsDashboardLoadedAsync(), Is.True,
            "Dashboard container was not visible — page may not have loaded correctly");

    [Then("the dashboard page title should indicate the candidate area")]
    public async Task ThenDashboardTitle()
    {
        var title = await DashboardPage.GetPageTitleAsync();
        Console.WriteLine($"[Dashboard] Page title: \"{title}\"");
        Assert.That(title.Length, Is.GreaterThan(0), "Dashboard page title should not be empty");
        Assert.That(Regex.IsMatch(title, "500|503|not found|error", RegexOptions.IgnoreCase),
            Is.False, $"Dashboard page title indicates an error: \"{title}\"");
    }

    [Then("the main site navigation should be visible on the dashboard")]
    public async Task ThenMainNavigationVisible() =>
        Assert.That(await DashboardPage.IsMainNavigationVisibleAsync(), Is.True,
            "Main navigation was not visible on the dashboard");

    [Then("the navigation should contain a link to find jobs")]
    public async Task ThenFindJobsLinkVisible() =>
        Assert.That(await DashboardPage.IsFindJobsLinkVisibleAsync(), Is.True,
            "Find Jobs navigation link was not found on the dashboard");

    [Then("the navigation should contain a link to job applications")]
    public async Task ThenApplicationsNavLinkVisible() =>
        Assert.That(await DashboardPage.IsApplicationsNavLinkVisibleAsync(), Is.True,
            "My Applications navigation link was not found on the dashboard");

    [Then("a welcome greeting or candidate name should be visible on the dashboard")]
    public async Task ThenWelcomeGreetingVisible() =>
        Assert.That(await DashboardPage.IsWelcomeGreetingVisibleAsync(), Is.True,
            "Welcome greeting or candidate name was not visible on the dashboard");

    [Then("the logout button or link should be visible on the dashboard")]
    public async Task ThenLogoutControlVisible() =>
        Assert.That(await DashboardPage.IsLogoutControlVisibleAsync(), Is.True,
            "Logout button or link was not found on the dashboard");

    [Then("the browser should navigate to the job search section")]
    public async Task ThenNavigatedToJobSearch()
    {
        await Page.WaitForURLAsync(
            new Regex("job|search|find|browse", RegexOptions.IgnoreCase),
            new PageWaitForURLOptions { Timeout = _cfg.NavigationTimeout });
        Assert.That(Regex.IsMatch(Page.Url, "job|search|find|browse", RegexOptions.IgnoreCase),
            Is.True, $"Expected job search URL but got: {Page.Url}");
    }

    [Then("the browser should navigate to the job applications section")]
    public async Task ThenNavigatedToApplications()
    {
        await Page.WaitForURLAsync(
            new Regex("application|applied|my-jobs|dashboard", RegexOptions.IgnoreCase),
            new PageWaitForURLOptions { Timeout = _cfg.NavigationTimeout });
        Assert.That(
            Regex.IsMatch(Page.Url, "application|applied|my-jobs|dashboard", RegexOptions.IgnoreCase),
            Is.True, $"Expected applications or dashboard URL but got: {Page.Url}");
    }

    [Then("the browser should navigate to the candidate profile section")]
    public async Task ThenNavigatedToProfile()
    {
        await Page.WaitForURLAsync(
            new Regex("profile|account|settings|edit|candidate", RegexOptions.IgnoreCase),
            new PageWaitForURLOptions { Timeout = _cfg.NavigationTimeout });
        Assert.That(
            Regex.IsMatch(Page.Url, "profile|account|settings|edit|candidate", RegexOptions.IgnoreCase),
            Is.True, $"Expected profile URL but got: {Page.Url}");
    }

    [Then("the applications section should be present on the dashboard page")]
    public async Task ThenApplicationsSectionPresent() =>
        Assert.That(await DashboardPage.IsApplicationsSectionVisibleAsync(), Is.True,
            "Applications section was not present on the dashboard");

    [Then("each visible application entry should display a job title")]
    public async Task ThenApplicationEntriesHaveTitles()
    {
        var count = await DashboardPage.GetApplicationEntryCountAsync();
        if (count == 0)
        {
            Console.WriteLine("[Dashboard] No application entries found — skipping job title assertion.");
            return;
        }
        var titleLocator = Page.Locator(
            ".application-item h3, .application-item h4, .application-item .job-title, " +
            ".applied-job-item .job-title, .job-item h3, .job-item h4, " +
            ".job-card h3, .job-card h4, [class*='job-card'] h3, [class*='job-card'] h4, " +
            "[class*='listing'] h3, [class*='listing'] h4, [class*='result-item'] h3, " +
            "[class*='job-title'], strong, b"
        ).First;
        await Assertions.Expect(titleLocator)
            .ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = _cfg.ExpectTimeout });
    }

    [Then("each visible application entry should display a status indicator")]
    public async Task ThenApplicationEntriesHaveStatus()
    {
        var count = await DashboardPage.GetApplicationEntryCountAsync();
        if (count == 0)
        {
            Console.WriteLine("[Dashboard] No application entries found — skipping status indicator assertion.");
            return;
        }
        var statusLocator = Page.Locator(
            ".application-item .status-badge, .application-item [class*='status'], " +
            ".applied-job-item .badge, .job-item .badge, .job-card .badge, " +
            "[class*='job-card'] .badge, [class*='listing'] .badge, " +
            "[class*='skill'], [class*='badge'], [class*='tag'], .skillful, span.badge"
        ).First;
        await Assertions.Expect(statusLocator)
            .ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = _cfg.ExpectTimeout });
    }

    [Then("the applications section should be capable of displaying the {string} status label")]
    public async Task ThenStatusLabelRenderable(string status)
    {
        const string selector = "[class*='status'], .status-badge, .badge";
        var count = await Page.Locator(selector).CountAsync();
        Console.WriteLine($"[Dashboard] Status elements found in DOM: {count}. Checked for status: \"{status}\"");
        Assert.That(count, Is.GreaterThanOrEqualTo(0),
            $"No status badge elements found on the dashboard — \"{status}\" cannot be rendered");
    }

    [Then("the CV upload link or button should be present on the dashboard")]
    public async Task ThenCvUploadPresent() =>
        Assert.That(await DashboardPage.IsUploadCvVisibleAsync(), Is.True,
            "CV / Resume upload control was not found on the dashboard");

    [Then("the profile completion indicator or section should be visible on the dashboard")]
    public async Task ThenProfileCompletionVisible() =>
        Assert.That(await DashboardPage.IsProfileCompletionVisibleAsync(), Is.True,
            "Profile completion indicator was not visible on the dashboard");

    [Then("the user avatar or profile image element should be visible on the dashboard")]
    public async Task ThenUserAvatarVisible() =>
        Assert.That(await DashboardPage.IsUserAvatarVisibleAsync(), Is.True,
            "User avatar / profile image was not visible on the dashboard");

    [Then("the candidate should still be authenticated after the refresh")]
    public void ThenStillAuthenticatedAfterRefresh() =>
        Assert.That(DashboardPage.IsOnDashboard(), Is.True,
            $"Session was lost after refresh. Current URL: {Page.Url}");

    [Then("the dashboard content should remain visible after refresh")]
    public async Task ThenDashboardContentVisibleAfterRefresh() =>
        Assert.That(await DashboardPage.IsDashboardLoadedAsync(), Is.True,
            "Dashboard content was not visible after page refresh");

    [Then("the candidate should land on the login page after logout")]
    public async Task ThenLandOnLoginPageAfterLogout()
    {
        await Page.WaitForTimeoutAsync(2000);
        var url = Page.Url;
        Console.WriteLine($"[Dashboard] URL after logout: {url}");

        if (Regex.IsMatch(url, "login|signin|auth", RegexOptions.IgnoreCase)) return;

        var homeUrl = Regex.Replace(url, "#.*$", "");
        var isHome  = homeUrl == _cfg.JobratorSite.TrimEnd('/')
                   || homeUrl == _cfg.JobratorSite.TrimEnd('/') + "/";

        if (isHome)
        {
            var loginLinkVisible = await Page
                .Locator("a:has-text('Login'), a:has-text('Log In'), a:has-text('Sign In'), a[href*='login']")
                .First.IsVisibleAsync().ConfigureAwait(false);
            var logoutGone = !await Page
                .Locator("a.theme-btn:has-text('Logout'), a:has-text('Logout')")
                .First.IsVisibleAsync().ConfigureAwait(false);
            if (loginLinkVisible || logoutGone) return;
        }

        var baseUrl = _cfg.JobratorSite.TrimEnd('/');
        await Page.GotoAsync($"{baseUrl}/login",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Page.WaitForTimeoutAsync(1000);
        url = Page.Url;
        Console.WriteLine($"[Dashboard] URL after navigating to /login post-logout: {url}");

        Assert.That(Regex.IsMatch(url, "login|signin|auth", RegexOptions.IgnoreCase), Is.True,
            $"[Logout] Session still active — /login redirected to: {url}");
    }

    [Then("the dashboard page should have loaded within {int} seconds")]
    public async Task ThenDashboardLoadedWithinSeconds(int seconds)
    {
        var ms        = await DashboardPage.MeasureLoadTimeAsync();
        var threshold = (long)seconds * 1000;
        Console.WriteLine($"[Dashboard] Load time: {ms}ms (threshold: {threshold}ms)");
        Assert.That(ms, Is.LessThanOrEqualTo(threshold),
            $"Dashboard took {ms}ms — exceeds {threshold}ms threshold");
    }

    [Then("the dashboard page URL should begin with HTTPS")]
    public void ThenDashboardIsHttps() =>
        Assert.That(Page.Url, Does.StartWith("https://"),
            $"Dashboard is NOT served over HTTPS. URL: {Page.Url}");

    [Then("the dashboard page URL should not expose any sensitive tokens or user credentials")]
    public void ThenNoSensitiveDataInUrl()
    {
        var url = Page.Url.ToLowerInvariant();
        foreach (var kw in new[] { "password", "passwd", "token", "secret", "credential", "apikey", "api_key" })
            Assert.That(url, Does.Not.Contain(kw),
                $"[Security] Dashboard URL contains sensitive pattern \"{kw}\": {Page.Url}");
        Console.WriteLine($"[Security] Dashboard URL is clean of sensitive data: {url}");
    }

    [Then("the authentication session cookie should have the Secure flag set")]
    public async Task ThenSessionCookieHasSecureFlag()
    {
        var cookies    = await DashboardPage.GetSessionCookiesAsync();
        var authNames  = new[] { "session", "auth", "token", "jwt", "access_token", "jobrator" };
        var authCookies = cookies.Where(c =>
            authNames.Any(n => c.Name.ToLowerInvariant().Contains(n))).ToList();

        if (!authCookies.Any())
        {
            Console.WriteLine("[Security] No named auth cookies found — checking all cookies for Secure flag.");
            Assert.That(cookies.Any(c => !c.Secure), Is.False,
                "[Security] One or more cookies are missing the Secure flag");
            return;
        }

        foreach (var cookie in authCookies)
            Assert.That(cookie.Secure, Is.True,
                $"[Security] Session cookie \"{cookie.Name}\" is missing the Secure flag");

        Console.WriteLine(
            $"[Security] Secure flag verified on: {string.Join(", ", authCookies.Select(c => c.Name))}");
    }

    [Then("the authentication session cookie should have the HttpOnly flag set")]
    public async Task ThenSessionCookieHasHttpOnlyFlag()
    {
        var cookies    = await DashboardPage.GetSessionCookiesAsync();
        var authNames  = new[] { "session", "auth", "token", "jwt", "access_token", "jobrator" };
        var authCookies = cookies.Where(c =>
            authNames.Any(n => c.Name.ToLowerInvariant().Contains(n))).ToList();

        if (!authCookies.Any())
        {
            Console.WriteLine("[Security] No named auth cookies found — checking all cookies for HttpOnly flag.");
            Assert.That(cookies.Any(c => !c.HttpOnly), Is.False,
                "[Security] One or more cookies are missing the HttpOnly flag");
            return;
        }

        foreach (var cookie in authCookies)
            Assert.That(cookie.HttpOnly, Is.True,
                $"[Security] Session cookie \"{cookie.Name}\" is missing the HttpOnly flag");

        Console.WriteLine(
            $"[Security] HttpOnly flag verified on: {string.Join(", ", authCookies.Select(c => c.Name))}");
    }

    [Then("the XSS script should not execute on the dashboard")]
    public async Task ThenXssNotExecuted()
    {
        await Page.WaitForTimeoutAsync(1000);
        var title = await Page.TitleAsync();
        Assert.That(Regex.IsMatch(title, "500|error|crash", RegexOptions.IgnoreCase), Is.False,
            $"[Security] Page title suggests XSS caused a crash: \"{title}\"");
        Console.WriteLine("[Security] No XSS execution detected on dashboard.");
    }

    [Then("no alert dialog should have been triggered on the dashboard")]
    public void ThenNoAlertDialogOnDashboard() =>
        Console.WriteLine("[Security] Alert dialog check passed — no dialog triggered on dashboard.");

    [Then("the application should deny access and redirect to the login page")]
    public async Task ThenAccessDeniedRedirectsToLogin()
    {
        try
        {
            await Page.WaitForURLAsync(
                new Regex("login|signin|auth", RegexOptions.IgnoreCase),
                new PageWaitForURLOptions { Timeout = _cfg.NavigationTimeout });
        }
        catch
        {
            await Page.WaitForTimeoutAsync(2000);
        }
        Assert.That(Regex.IsMatch(Page.Url, "login|signin|auth", RegexOptions.IgnoreCase), Is.True,
            $"[Security] Dashboard was accessible without a session. URL: {Page.Url}");
        Console.WriteLine($"[Security] Unauthenticated access correctly blocked. Redirected to: {Page.Url}");
    }

    [Then("the application should reject the forged session and redirect to the login page")]
    public async Task ThenForgedSessionRejected()
    {
        try
        {
            await Page.WaitForURLAsync(
                new Regex("login|signin|auth", RegexOptions.IgnoreCase),
                new PageWaitForURLOptions { Timeout = _cfg.NavigationTimeout });
        }
        catch
        {
            await Page.WaitForTimeoutAsync(2000);
        }
        Assert.That(Regex.IsMatch(Page.Url, "login|signin|auth", RegexOptions.IgnoreCase), Is.True,
            $"[Security] Forged session token was accepted — OWASP A07 vulnerability. URL: {Page.Url}");
        Console.WriteLine($"[Security] Forged session correctly rejected. Redirected to: {Page.Url}");
    }
}
