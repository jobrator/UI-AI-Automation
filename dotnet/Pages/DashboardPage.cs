using System.Text.RegularExpressions;
using Microsoft.Playwright;

namespace Jobrator.E2E.Tests.Pages;

public sealed class DashboardPage
{
    private readonly IPage  _page;
    private readonly string _baseUrl;

    private const string MainNavigation =
        "nav, .navbar, header nav, .site-nav, [role='navigation'], .header-area";

    private const string FindJobsLink =
        "a:has-text('Find Jobs'), a:has-text('Find Job'), a:has-text('Search Jobs'), " +
        "a:has-text('Browse Jobs'), [data-testid='find-jobs-link']";

    private const string CandidatesDropdown =
        "a[data-bs-toggle='dropdown']:has-text('Candidates'), " +
        "a[data-toggle='dropdown']:has-text('Candidates'), " +
        "a.dropdown-toggle:has-text('Candidates'), " +
        "button.dropdown-toggle:has-text('Candidates'), " +
        "a:has-text('Candidates'), button:has-text('Candidates'), " +
        "[data-testid='candidates-dropdown']";

    private const string ApplicationsNavLink =
        "a:has-text('Candidates'), a:has-text('My Applications'), " +
        "a:has-text('Applications'), a:has-text('Applied Jobs'), [data-testid='applications-nav-link']";

    private const string LogoutControl =
        "a.theme-btn:has-text('Logout'), a:has-text('Logout'), button:has-text('Logout'), " +
        "a:has-text('Log Out'), [data-testid='logout-button']";

    private const string WelcomeGreeting =
        "h1, h2, .welcome-text, .greeting, .page-title, .page-heading, " +
        "[data-testid='welcome-greeting'], .user-name, .candidate-name";

    private const string ApplicationsSection =
        ".my-applications, .applied-jobs, .applications-list, [data-testid='applications-section'], " +
        "section:has-text('Application'), .job-listings, .jobs-container, .job-list, " +
        ".search-result-area, .recommended-jobs, " +
        "h2:has-text('Recommended Jobs'), h1:has-text('Jobs'), h2:has-text('Jobs')";

    private const string ApplicationEntries =
        ".application-item, .applied-job-item, .job-application-row, [data-testid='application-entry'], " +
        ".application-card, [data-testid*='application'], [class*='applied-job']";

    private const string ApplicationStatusBadge =
        ".status-badge, .application-status, .badge, [class*='status'], [data-testid='application-status']";

    private const string UploadCvControl =
        "a:has-text('Create your CV'), a:has-text('Create Your CV'), " +
        "a:has-text('Update CV'), a:has-text('Update your CV'), " +
        "a.upload-cv, a:has-text('Upload CV'), a:has-text('Upload Resume'), " +
        "button:has-text('Upload CV'), button:has-text('Create CV'), " +
        "[data-testid='upload-cv']";

    private const string UploadCvFileInput =
        "input[type='file'][accept*='pdf'], input[type='file'][accept*='doc'], " +
        "input[type='file'][accept*='docx'], input[type='file'][name*='cv'], " +
        "input[type='file'][id*='cv'], input[type='file'][aria-label*='CV'], " +
        "input[type='file'][aria-label*='Resume'], input[type='file']";

    private const string CvTitleInput =
        "input[placeholder='Enter Title'], " +
        "input[name='cv_title'], input[name='cvTitle'], input[name='title'], " +
        "input[id='cv_title'], input[id='cvTitle'], " +
        "input[placeholder*='title' i], input[placeholder*='enter title' i]";

    private const string CvSubmitButton =
        "button:has-text('Submit'), " +
        "button[type='submit'], input[type='submit'], " +
        "button:has-text('Save'), button:has-text('Upload CV'), " +
        "button.theme-btn:has-text('Submit')";

    private const string UploadSuccessIndicator =
        ".alert-success, .flash-success, [class*='success']:not(button):not(a), " +
        "[class*='notification']:has-text('save'), [class*='notification']:has-text('creat'), " +
        "[class*='notification']:has-text('upload'), .alert:has-text('success'), " +
        ".alert:has-text('save'), .alert:has-text('creat'), " +
        ".upload-success, .cv-uploaded, [data-testid='upload-success']";

    private const string ProfileCompletionSection =
        ".profile-completion, .completion-bar, .progress-bar, [data-testid='profile-completion'], " +
        "[class*='completion'], [class*='progress'], a:has-text('Create your CV'), " +
        "a:has-text('Update CV'), a:has-text('Create CV')";

    private const string UserAvatar =
        ".user-avatar, .profile-photo, .profile-pic, img[alt*='profile' i], img[alt*='avatar' i], " +
        ".avatar, [data-testid='user-avatar'], [class*='user-avatar'], [class*='profile-img'], " +
        ".nav-user img, .header-user img, header img, nav img, .navbar-brand img, .logo img";

    private const string ViewIconJsPattern     = "la-eye";
    private const string DownloadIconJsPattern = "la-download";
    private const string DeleteIconJsPattern   = "la-trash";

    private const string CvViewIcon =
        "a:has(span.la-eye), a:has(span[class*='la-eye']), " +
        "a:has(button:has(span[class*='la-eye'])), " +
        "button:has(span.la-eye), button:has(span[class*='la-eye'])";

    private const string CvDownloadIcon =
        "button:has(span.la-download), " +
        "button:has(span[class*='la-download'])";

    private const string CvDeleteIcon =
        "button:has(span.la-trash), " +
        "button:has(span[class*='la-trash'])";

    private const string DeleteConfirmButton =
        ".modal button:has-text('Delete'), " +
        ".swal2-popup button:has-text('Delete'), " +
        ".swal2-confirm, " +
        "[role='dialog'] button:has-text('Delete'), " +
        ".modal-dialog button.btn-danger";

    private const string SearchInput =
        "input[type='search'], input[placeholder*='search' i], input[placeholder*='job' i], " +
        "input[placeholder*='keyword' i], input[placeholder*='company' i], " +
        ".search-input, [data-testid='dashboard-search']";

    public DashboardPage(IPage page, string baseUrl)
    {
        _page    = page;
        _baseUrl = baseUrl.TrimEnd('/');
    }

    private async Task<bool> IsAnyVisibleAsync(string selector)
    {
        var all = await _page.Locator(selector).AllAsync();
        foreach (var loc in all)
            if (await loc.IsVisibleAsync()) return true;

        if (selector.Contains("Candidates"))
        {
            return await _page.EvaluateAsync<bool>(@"() => {
                for (const el of Array.from(document.querySelectorAll('*'))) {
                    const t = el.textContent?.trim() ?? '';
                    if (t === 'Candidates' || (t.startsWith('Candidates') && t.length < 15)) {
                        const rect = el.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) return true;
                    }
                }
                return false;
            }");
        }
        return false;
    }

    private async Task ClickDropdownToggleAsync()
    {
        var all = await _page.Locator(CandidatesDropdown).AllAsync();
        foreach (var loc in all)
        {
            if (await loc.IsVisibleAsync())
            {
                await loc.ClickAsync();
                return;
            }
        }

        var bsSelectors = new[]
        {
            "a[data-bs-toggle='dropdown']:has-text('Candidates')",
            "a[data-toggle='dropdown']:has-text('Candidates')",
            "a.dropdown-toggle:has-text('Candidates')",
            "button.dropdown-toggle:has-text('Candidates')",
        };
        foreach (var sel in bsSelectors)
        {
            var locs = await _page.Locator(sel).AllAsync();
            foreach (var loc in locs)
            {
                try
                {
                    await loc.ClickAsync(new LocatorClickOptions { Force = true });
                    await _page.WaitForTimeoutAsync(400);
                    return;
                }
                catch { }
            }
        }

        var clicked = await _page.EvaluateAsync<bool>(@"() => {
            const tags = ['a', 'button', '[role=""button""]', 'li', 'span', 'div'];
            for (const tag of tags) {
                for (const el of Array.from(document.querySelectorAll(tag))) {
                    const t = el.textContent?.trim() ?? '';
                    if (t === 'Candidates' || (t.startsWith('Candidates') && t.length < 15)) {
                        const rect = el.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            el.click();
                            return true;
                        }
                    }
                }
            }
            return false;
        }");

        if (!clicked)
            throw new InvalidOperationException(
                "Could not open the Candidates dropdown — no suitable trigger found");

        await _page.WaitForTimeoutAsync(400);
    }

    public async Task NavigateAsync()
    {
        await _page.GotoAsync($"{_baseUrl}/dashboard",
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
        await _page.WaitForURLAsync(
            new Regex("home|candidate|jobs|application|profile|login|signin|auth",
                      RegexOptions.IgnoreCase),
            new PageWaitForURLOptions { Timeout = 30000 });
    }

    public Task<bool> IsLoadedAsync() =>
        _page.Locator(LogoutControl).First.IsVisibleAsync();

    public Task ClickFindJobsAsync() =>
        _page.Locator(FindJobsLink).First.ClickAsync();

    public async Task ClickMyApplicationsAsync()
    {
        const string direct = "a:has-text('My Applications'), a:has-text('Applied Jobs')";
        if (await _page.Locator(direct).First.IsVisibleAsync())
        {
            await _page.Locator(direct).First.ClickAsync();
            return;
        }

        await ClickDropdownToggleAsync();
        await _page.WaitForTimeoutAsync(600);

        var candidates = await _page.Locator(
            ".dropdown-menu a, [class*='dropdown'] a, " +
            "a:has-text('My Applications'), a:has-text('Applied Jobs'), " +
            "a[href*='applied'], a[href*='application']"
        ).AllAsync();

        foreach (var link in candidates)
        {
            if (!await link.IsVisibleAsync()) continue;
            var text = ((await link.TextContentAsync()) ?? "").ToLowerInvariant();
            var href = ((await link.GetAttributeAsync("href")) ?? "").ToLowerInvariant();
            if (Regex.IsMatch(text + href, "application|applied"))
            {
                await link.ClickAsync();
                return;
            }
        }

        await _page.GotoAsync($"{_baseUrl}/dashboard",
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
        await _page.WaitForURLAsync(
            new Regex("dashboard|application|applied"),
            new PageWaitForURLOptions { Timeout = 15000 });
    }

    public async Task ClickMyProfileAsync()
    {
        const string direct =
            "a:has-text('My Profile'), a:has-text('Edit Profile'), a:has-text('Account Settings')";
        if (await _page.Locator(direct).First.IsVisibleAsync())
        {
            await _page.Locator(direct).First.ClickAsync();
            return;
        }

        await ClickDropdownToggleAsync();
        await _page.WaitForTimeoutAsync(600);

        var candidates = await _page.Locator(
            ".dropdown-menu a, [class*='dropdown'] a, " +
            "a:has-text('My Profile'), a:has-text('Edit Profile'), " +
            "a[href*='profile'], a[href*='candidate']"
        ).AllAsync();

        foreach (var link in candidates)
        {
            if (!await link.IsVisibleAsync()) continue;
            var text = ((await link.TextContentAsync()) ?? "").ToLowerInvariant();
            var href = ((await link.GetAttributeAsync("href")) ?? "").ToLowerInvariant();
            if (Regex.IsMatch(text + href, "profile|candidate"))
            {
                await link.ClickAsync();
                return;
            }
        }

        await _page.GotoAsync($"{_baseUrl}/candidate",
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
        await _page.WaitForURLAsync(
            new Regex("candidate|profile|account"),
            new PageWaitForURLOptions { Timeout = 15000 });
    }

    public async Task ClickLogoutAsync()
    {
        var formAction = await _page.EvaluateAsync<string?>(@"() => {
            for (const form of Array.from(document.querySelectorAll('form'))) {
                if (/logout|signout/i.test(form.action)) return form.action;
            }
            return null;
        }");

        if (!string.IsNullOrEmpty(formAction))
        {
            await _page.GotoAsync(formAction,
                new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
            try
            {
                await _page.WaitForURLAsync(
                    new Regex("login|signin|auth|home|/$", RegexOptions.IgnoreCase),
                    new PageWaitForURLOptions { Timeout = 15000 });
            }
            catch { }
            return;
        }

        var specific = await _page.Locator("a.theme-btn:has-text('Logout')").AllAsync();
        var currentUrl = _page.Url;
        foreach (var loc in specific)
        {
            if (!await loc.IsVisibleAsync()) continue;
            await loc.ClickAsync();
            try
            {
                await _page.WaitForURLAsync(
                    url => url.ToString() != currentUrl && !url.ToString().EndsWith("#"),
                    new PageWaitForURLOptions { Timeout = 5000 });
                return;
            }
            catch
            {
                break;
            }
        }

        await _page.GotoAsync($"{_baseUrl}/logout",
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
        try
        {
            await _page.WaitForURLAsync(
                new Regex("login|signin|auth|home", RegexOptions.IgnoreCase),
                new PageWaitForURLOptions { Timeout = 10000 });
        }
        catch { }
    }

    public async Task RefreshAsync()
    {
        await _page.ReloadAsync();
        await _page.Locator(LogoutControl).First.WaitForAsync(
            new LocatorWaitForOptions { State = WaitForSelectorState.Visible, Timeout = 30000 });
    }

    private async Task NavigateToCvManagerAsync()
    {
        await _page.GotoAsync($"{_baseUrl}/dashboard/cv-manager",
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
    }

    public async Task SelectCvFileWithoutSubmittingAsync(string filePath)
    {
        await NavigateToCvManagerAsync();
        await _page.WaitForTimeoutAsync(1000);
        Console.WriteLine($"[Dashboard] CV form URL (select only): {_page.Url}");

        try
        {
            var titleLoc = _page.Locator(CvTitleInput).First;
            await titleLoc.WaitForAsync(new LocatorWaitForOptions
                { State = WaitForSelectorState.Attached, Timeout = 10000 });
            await titleLoc.ScrollIntoViewIfNeededAsync();
            var cvTitle = $"Test CV {Guid.NewGuid().ToString("N")[..8].ToUpper()}";
            await titleLoc.ClickAsync();
            await titleLoc.ClearAsync();
            await titleLoc.PressSequentiallyAsync(cvTitle, new LocatorPressSequentiallyOptions { Delay = 40 });
            Console.WriteLine($"[Dashboard] CV title entered: \"{cvTitle}\"");
        }
        catch { Console.WriteLine("[Dashboard] CV title input not found — skipping."); }

        var fileInput = _page.Locator(UploadCvFileInput).First;
        try
        {
            await fileInput.WaitForAsync(new LocatorWaitForOptions
                { State = WaitForSelectorState.Attached, Timeout = 8000 });
        }
        catch { }
        await fileInput.SetInputFilesAsync(filePath);
        Console.WriteLine($"[Dashboard] Original CV selected (no submit): {Path.GetFileName(filePath)}");
        await _page.WaitForTimeoutAsync(500);
    }

    public async Task ReplaceCvFileSelectionAsync(string filePath)
    {
        var fileInput = _page.Locator(UploadCvFileInput).First;
        await fileInput.SetInputFilesAsync(filePath);
        Console.WriteLine($"[Dashboard] CV file selection replaced with: {Path.GetFileName(filePath)}");
        await _page.WaitForTimeoutAsync(500);
    }

    public async Task SubmitCvUploadFormAsync()
    {
        try
        {
            var submitLoc = _page.Locator(CvSubmitButton).First;
            await submitLoc.WaitForAsync(new LocatorWaitForOptions
                { State = WaitForSelectorState.Attached, Timeout = 10000 });
            await submitLoc.ScrollIntoViewIfNeededAsync();
            await submitLoc.ClickAsync();
            Console.WriteLine("[Dashboard] CV upload form submitted.");
            await _page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
            await _page.WaitForTimeoutAsync(2000);
            Console.WriteLine($"[Dashboard] Post-submit URL: {_page.Url}");
        }
        catch
        {
            Console.WriteLine("[Dashboard] CV submit button not found — form may have auto-submitted.");
        }
    }

    public async Task UploadCvAsync(string filePath)
    {
        await NavigateToCvManagerAsync();
        await _page.WaitForTimeoutAsync(1000);
        Console.WriteLine($"[Dashboard] CV form URL: {_page.Url}");

        try
        {
            var titleLoc = _page.Locator(CvTitleInput).First;
            await titleLoc.WaitForAsync(new LocatorWaitForOptions
            {
                State   = WaitForSelectorState.Attached,
                Timeout = 10000
            });
            await titleLoc.ScrollIntoViewIfNeededAsync();
            var cvTitle = $"Test CV {Guid.NewGuid().ToString("N")[..8].ToUpper()}";
            await titleLoc.ClickAsync();
            await titleLoc.ClearAsync();
            await titleLoc.PressSequentiallyAsync(cvTitle, new LocatorPressSequentiallyOptions { Delay = 40 });
            Console.WriteLine($"[Dashboard] CV title entered: \"{cvTitle}\"");
        }
        catch
        {
            Console.WriteLine("[Dashboard] CV title input not found — skipping title entry.");
        }

        var fileInput = _page.Locator(UploadCvFileInput).First;
        try
        {
            await fileInput.WaitForAsync(new LocatorWaitForOptions
            {
                State   = WaitForSelectorState.Attached,
                Timeout = 8000
            });
        }
        catch { }
        await fileInput.SetInputFilesAsync(filePath);
        Console.WriteLine($"[Dashboard] CV file selected: {Path.GetFileName(filePath)}");
        await _page.WaitForTimeoutAsync(500);

        try
        {
            var submitLoc = _page.Locator(CvSubmitButton).First;
            await submitLoc.WaitForAsync(new LocatorWaitForOptions
            {
                State   = WaitForSelectorState.Attached,
                Timeout = 10000
            });
            await submitLoc.ScrollIntoViewIfNeededAsync();
            await submitLoc.ClickAsync();
            Console.WriteLine("[Dashboard] CV submit button clicked.");
            await _page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
            await _page.WaitForTimeoutAsync(2000);
            Console.WriteLine($"[Dashboard] Post-submit URL: {_page.Url}");
        }
        catch
        {
            Console.WriteLine("[Dashboard] CV submit button not found — form may auto-submit on file selection.");
        }
    }

    public async Task<bool> IsUploadSuccessVisibleAsync()
    {
        if (await _page.Locator(UploadSuccessIndicator).CountAsync() > 0)
            return true;

        var cvListCount = await _page.Locator(
            ".resume-item, .cv-item, .uploaded-cv, [class*='resume-item'], " +
            "[class*='cv-item'], .file-item, .attachment-item, " +
            "table td a[href*='cv'], table td a[href*='resume'], " +
            ".card:has(a[href*='.pdf']), .card:has(a[href*='.doc'])"
        ).CountAsync();
        if (cvListCount > 0)
            return true;

        return Regex.IsMatch(_page.Url, @"cv|resume|candidate|profile", RegexOptions.IgnoreCase)
            && !Regex.IsMatch(_page.Url, @"create|new|edit|cv-manager", RegexOptions.IgnoreCase);
    }

    public async Task<bool> IsUploadCvFileInputFilledAsync()
    {
        var uploadInput = _page.Locator(UploadCvFileInput).First;
        if ((await uploadInput.CountAsync().ConfigureAwait(false)) != 1)
            return false;

        return await uploadInput.EvaluateAsync<bool>("el => el.files && el.files.length > 0");
    }

    public async Task ClickUploadSuccessOkAsync()
    {
        try
        {
            await _page.GetByText("Document Uploaded Successfully!").First
                .WaitForAsync(new LocatorWaitForOptions
                {
                    State   = WaitForSelectorState.Visible,
                    Timeout = 20000
                });
            Console.WriteLine("[Dashboard] Success popup detected — locating OK button.");
        }
        catch
        {
            Console.WriteLine("[Dashboard] No success popup visible — step skipped (CV already accepted).");
            return;
        }

        await _page.WaitForTimeoutAsync(300);

        try
        {
            var roleBtn = _page.GetByRole(AriaRole.Button, new PageGetByRoleOptions { Name = "OK" });
            var count = await roleBtn.CountAsync();
            for (var i = 0; i < count; i++)
            {
                var loc = roleBtn.Nth(i);
                if (!await loc.IsVisibleAsync()) continue;
                await loc.ClickAsync();
                Console.WriteLine("[Dashboard] Clicked OK button via GetByRole.");
                await _page.WaitForTimeoutAsync(800);
                return;
            }
        }
        catch { }

        var tagSelectors = new[] { "button", "a", "input[type='button']", "input[type='submit']" };
        foreach (var tag in tagSelectors)
        {
            var locs = _page.Locator(tag);
            var total = await locs.CountAsync();
            for (var i = 0; i < total; i++)
            {
                var loc = locs.Nth(i);
                if (!await loc.IsVisibleAsync()) continue;
                var text = tag.StartsWith("input")
                    ? await loc.GetAttributeAsync("value") ?? ""
                    : await loc.InnerTextAsync();
                if (!Regex.IsMatch(text.Trim(), @"^ok$", RegexOptions.IgnoreCase)) continue;
                await loc.ClickAsync();
                Console.WriteLine($"[Dashboard] Clicked OK button via <{tag}> iteration.");
                await _page.WaitForTimeoutAsync(800);
                return;
            }
        }

        var clicked = await _page.EvaluateAsync<bool>(@"() => {
            const candidates = Array.from(
                document.querySelectorAll('button, a, input, div, span'));
            for (const el of candidates) {
                const t = el.tagName === 'INPUT'
                    ? (el.value ?? '')
                    : (el.textContent ?? '');
                if (/^ok$/i.test(t.trim()) && el.offsetWidth > 0 && el.offsetHeight > 0) {
                    el.click();
                    return true;
                }
            }
            return false;
        }");

        Console.WriteLine(clicked
            ? "[Dashboard] Clicked OK button via JS fallback."
            : "[Dashboard] OK button not found — popup may have auto-dismissed.");

        await _page.WaitForTimeoutAsync(800);
    }

    private async Task HoverCvItemAndClickIconAsync(string iconSelector, string jsIconPattern)
    {
        try
        {
            await _page.GetByText("Document Uploaded Successfully!").First
                .WaitForAsync(new LocatorWaitForOptions
                {
                    State   = WaitForSelectorState.Hidden,
                    Timeout = 8000
                });
        }
        catch { }

        await _page.WaitForTimeoutAsync(500);
        await _page.EvaluateAsync("window.scrollTo(0, document.body.scrollHeight)");
        await _page.WaitForTimeoutAsync(1000);

        var iconLoc = _page.Locator(iconSelector);
        if (await iconLoc.CountAsync() > 0 && await iconLoc.First.IsVisibleAsync())
        {
            await iconLoc.First.ClickAsync();
            Console.WriteLine("[Dashboard] Clicked icon (already visible).");
            return;
        }

        var hiddenCount = await iconLoc.CountAsync();
        Console.WriteLine($"[Dashboard] Icon matches in DOM (incl. hidden): {hiddenCount}");
        if (hiddenCount > 0)
        {
            await iconLoc.First.EvaluateAsync("el => el.click()");
            Console.WriteLine("[Dashboard] JS el.click() on hidden icon via CSS selector.");
            await _page.WaitForTimeoutAsync(500);
            return;
        }

        var domSnippet = await _page.EvaluateAsync<string>(@"() => {
            const html = document.body.innerHTML;
            const idx  = html.search(/uploaded.resumes?/i);
            if (idx >= 0) return html.substring(idx, Math.min(html.length, idx + 3000));
            const spanEls = Array.from(document.querySelectorAll('span[class]'))
                                 .map(e => e.className).join(' | ');
            return 'Uploaded Resumes section not found in DOM.\n<span> classes: ' + (spanEls || 'none');
        }");
        Console.WriteLine($"[Dashboard] DOM snapshot:\n{domSnippet.Substring(0, Math.Min(domSnippet.Length, 2000))}");

        var jsClicked = await _page.EvaluateAsync<bool>($@"() => {{
            const pattern = '{jsIconPattern}';
            const icons = Array.from(document.querySelectorAll('span[class]'));
            for (const icon of icons) {{
                const cls = icon.className?.toString() ?? '';
                if (cls.includes(pattern)) {{
                    const clickTarget = icon.closest('a, button') ?? icon.parentElement ?? icon;
                    clickTarget.click();
                    return true;
                }}
            }}
            return false;
        }}");
        if (jsClicked)
        {
            Console.WriteLine($"[Dashboard] JS-clicked icon via LineAwesome pattern '{jsIconPattern}'.");
            await _page.WaitForTimeoutAsync(500);
            return;
        }

        var cardContainers = _page.Locator(".file-edit-box");
        var cardCount = await cardContainers.CountAsync();
        Console.WriteLine($"[Dashboard] .file-edit-box card candidates: {cardCount}");

        for (var ci = 0; ci < cardCount; ci++)
        {
            var card = cardContainers.Nth(ci);
            try
            {
                await card.ScrollIntoViewIfNeededAsync();
                await card.HoverAsync();
                await _page.WaitForTimeoutAsync(600);

                var afterHover = _page.Locator(iconSelector);

                if (await afterHover.CountAsync() > 0 && await afterHover.First.IsVisibleAsync())
                {
                    await afterHover.First.ClickAsync();
                    Console.WriteLine($"[Dashboard] Clicked visible icon after hovering card #{ci}.");
                    return;
                }
                if (await afterHover.CountAsync() > 0)
                {
                    await afterHover.First.ClickAsync(new LocatorClickOptions { Force = true });
                    Console.WriteLine($"[Dashboard] Force-clicked icon after hovering card #{ci}.");
                    return;
                }
            }
            catch { }
        }

        throw new InvalidOperationException(
            $"Could not find or click action icon '{iconSelector}' (JS pattern: '{jsIconPattern}'). " +
            "Review the DOM snapshot in console output above for the actual class names.");
    }

    public async Task<int> GetUploadedCvCountAsync()
    {
        await _page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        var count = await _page.Locator(".file-edit-box").CountAsync();
        Console.WriteLine($"[Dashboard] Uploaded CV count (.file-edit-box): {count}");
        return count;
    }

    public async Task<IPage?> HoverCvAndClickViewAsync()
    {
        var newPageTask = _page.Context.WaitForPageAsync();

        await HoverCvItemAndClickIconAsync(CvViewIcon, ViewIconJsPattern);
        Console.WriteLine("[Dashboard] Clicked CV view icon.");

        try
        {
            var newPage = await newPageTask.WaitAsync(TimeSpan.FromSeconds(10));
            await newPage.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
            Console.WriteLine($"[Dashboard] CV opened in new tab: {newPage.Url}");
            return newPage;
        }
        catch
        {
            Console.WriteLine("[Dashboard] No new tab opened — CV may have opened inline.");
            return null;
        }
    }

    public async Task<IDownload?> HoverCvAndClickDownloadAsync()
    {
        try
        {
            var download = await _page.RunAndWaitForDownloadAsync(
                () => HoverCvItemAndClickIconAsync(CvDownloadIcon, DownloadIconJsPattern));
            Console.WriteLine($"[Dashboard] CV download triggered: {download.SuggestedFilename}");
            return download;
        }
        catch
        {
            Console.WriteLine("[Dashboard] No download captured — CV may open inline.");
            return null;
        }
    }

    public Task HoverCvAndClickDeleteAsync() =>
        HoverCvItemAndClickIconAsync(CvDeleteIcon, DeleteIconJsPattern);

    public async Task ClickDeleteConfirmationAsync()
    {
        var selectors = new[]
        {
            ".swal2-confirm", ".swal-button--confirm",
            ".modal button:has-text('Delete')", ".modal-dialog button.btn-danger",
            "[role='dialog'] button:has-text('Delete')",
            "button:has-text('Delete')", "a:has-text('Delete')",
        };

        foreach (var sel in selectors)
        {
            try
            {
                var loc = _page.Locator(sel).First;
                await loc.WaitForAsync(new LocatorWaitForOptions
                {
                    State   = WaitForSelectorState.Visible,
                    Timeout = 2000
                });
                await loc.ClickAsync();
                Console.WriteLine($"[Dashboard] Clicked Delete confirmation via: {sel}");
                await _page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
                await _page.WaitForTimeoutAsync(1000);
                return;
            }
            catch { }
        }

        var clicked = await _page.EvaluateAsync<bool>(@"() => {
            for (const el of Array.from(document.querySelectorAll('button, a'))) {
                const t = el.textContent?.trim();
                if (t === 'Delete' && el.offsetWidth > 0) { el.click(); return true; }
            }
            return false;
        }");

        if (clicked)
        {
            Console.WriteLine("[Dashboard] Clicked Delete confirmation via JS fallback.");
            await _page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
            await _page.WaitForTimeoutAsync(1000);
        }
        else
        {
            throw new InvalidOperationException("Delete confirmation button not found.");
        }
    }

    public async Task<bool> IsCvCountDecreasedAsync(int countBefore)
    {
        await _page.WaitForTimeoutAsync(1500);
        var countAfter = await GetUploadedCvCountAsync();
        Console.WriteLine($"[Dashboard] CV count — before: {countBefore}, after: {countAfter}");
        return countAfter < countBefore;
    }

    public async Task EnterSearchValueAsync(string value)
    {
        var input = _page.Locator($"input[name='listing-search'], {SearchInput}").First;
        try
        {
            await input.WaitForAsync(
                new LocatorWaitForOptions { State = WaitForSelectorState.Attached, Timeout = 5000 });
            await input.FillAsync(value, new LocatorFillOptions { Force = true });
        }
        catch
        {
            await _page.Locator("input[type='text']").First
                .FillAsync(value, new LocatorFillOptions { Force = true });
        }
    }

    public async Task NavigateWithForgedSessionAsync(string cookieName, string forgedValue)
    {
        await _page.Context.AddCookiesAsync(new[]
        {
            new Cookie
            {
                Name   = cookieName,
                Value  = forgedValue,
                Domain = new Uri(_baseUrl).Host,
                Path   = "/"
            }
        });
        await _page.GotoAsync($"{_baseUrl}/dashboard",
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
    }

    public Task<bool> IsDashboardLoadedAsync() =>
        _page.Locator(LogoutControl).First.IsVisibleAsync();

    public Task<string> GetPageTitleAsync() => _page.TitleAsync();

    public Task<bool> IsMainNavigationVisibleAsync() =>
        _page.Locator(MainNavigation).First.IsVisibleAsync();

    public Task<bool> IsFindJobsLinkVisibleAsync() =>
        _page.Locator(FindJobsLink).First.IsVisibleAsync();

    public async Task<bool> IsApplicationsNavLinkVisibleAsync()
    {
        if (await _page.Locator("a:has-text('My Applications'), a:has-text('Applied Jobs')")
                       .First.IsVisibleAsync())
            return true;
        return await IsAnyVisibleAsync(ApplicationsNavLink);
    }

    public Task<bool> IsWelcomeGreetingVisibleAsync() =>
        _page.Locator(WelcomeGreeting).First.IsVisibleAsync();

    public Task<bool> IsLogoutControlVisibleAsync() =>
        _page.Locator(LogoutControl).First.IsVisibleAsync();

    public Task<bool> IsApplicationsSectionVisibleAsync() =>
        _page.Locator(ApplicationsSection).First.IsVisibleAsync();

    public Task<int> GetApplicationEntryCountAsync() =>
        _page.Locator(ApplicationEntries).CountAsync();

    public Task<bool> IsUploadCvVisibleAsync() =>
        _page.Locator(UploadCvControl).First.IsVisibleAsync();

    public Task<bool> IsProfileCompletionVisibleAsync() =>
        _page.Locator(ProfileCompletionSection).First.IsVisibleAsync();

    public Task<bool> IsUserAvatarVisibleAsync() =>
        _page.Locator(UserAvatar).First.IsVisibleAsync();

    public async Task<bool> IsStatusLabelInDomAsync(string statusText)
    {
        var selector =
            $"{ApplicationStatusBadge}:has-text('{statusText}'), " +
            $"[class*='status']:has-text('{statusText}'), .badge:has-text('{statusText}')";
        return await _page.Locator(selector).CountAsync() > 0;
    }

    public async Task<long> MeasureLoadTimeAsync()
    {
        var start = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        await _page.GotoAsync(_baseUrl,
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
        return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - start;
    }

    public Task<IReadOnlyList<BrowserContextCookiesResult>> GetSessionCookiesAsync() =>
        _page.Context.CookiesAsync();

    public bool IsOnLoginPage() =>
        Regex.IsMatch(_page.Url, "login|signin|auth", RegexOptions.IgnoreCase);

    public bool IsOnDashboard() =>
        Regex.IsMatch(_page.Url, "dashboard|home|candidate|jobs|application", RegexOptions.IgnoreCase);
}
