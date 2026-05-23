using Microsoft.Playwright;

namespace Jobrator.E2E.Tests.Support;

public sealed class PlaywrightDriver : IDisposable
{
    private IPlaywright? _playwright;
    private IBrowser?    _browser;
    private bool         _disposed;

    public IPage Page { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        var cfg = EnvConfig.Instance;

        _playwright = await Playwright.CreateAsync();

        IBrowserType browserType = cfg.BrowserType.ToLowerInvariant() switch
        {
            "firefox" => _playwright.Firefox,
            "webkit"  => _playwright.Webkit,
            _         => _playwright.Chromium
        };

        _browser = await browserType.LaunchAsync(new BrowserTypeLaunchOptions
        {
            Headless = cfg.Headless,
            SlowMo   = cfg.SlowMo
        });

        var context = await _browser.NewContextAsync(new BrowserNewContextOptions
        {
            ViewportSize = new ViewportSize { Width = 1280, Height = 720 }
        });

        context.SetDefaultTimeout(cfg.DefaultTimeout);
        context.SetDefaultNavigationTimeout(cfg.NavigationTimeout);

        Page = await context.NewPageAsync();
    }

    public async Task<byte[]> TakeScreenshotAsync()
    {
        if (Page is null) return [];
        return await Page.ScreenshotAsync(new PageScreenshotOptions { FullPage = false });
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _browser?.CloseAsync().GetAwaiter().GetResult();
        _playwright?.Dispose();
    }
}
