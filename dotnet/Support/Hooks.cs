using System.Text.RegularExpressions;
using Jobrator.E2E.Tests.Pages;
using Microsoft.Playwright;
using Reqnroll;

namespace Jobrator.E2E.Tests.Support;

[Binding]
public sealed class Hooks
{
    private readonly ScenarioContext _scenario;

    public Hooks(ScenarioContext scenario) => _scenario = scenario;

    [BeforeScenario(Order = 1)]
    public async Task BeforeScenario()
    {
        var driver = new PlaywrightDriver();
        await driver.InitializeAsync();
        _scenario.Set(driver);
        Console.WriteLine($"[Hooks] Browser ready — {_scenario.ScenarioInfo.Title}");
    }

    [BeforeScenario("@requires-login", Order = 2)]
    public async Task BeforeRequiresLogin()
    {
        var cfg       = EnvConfig.Instance;
        var page      = _scenario.Get<PlaywrightDriver>().Page;
        var loginPage = new LoginPage(page, cfg.JobratorSite);

        await loginPage.NavigateAsync();
        await loginPage.LoginAsync(cfg.CandidateEmail, cfg.CandidatePassword);

        await page.WaitForURLAsync(
            new Regex("dashboard|home|profile|jobs|application", RegexOptions.IgnoreCase),
            new PageWaitForURLOptions { Timeout = cfg.NavigationTimeout });

        Console.WriteLine("[Hooks] Pre-condition: user is now logged in (@requires-login).");
    }

    [AfterScenario]
    public async Task AfterScenario()
    {
        var driver = _scenario.Get<PlaywrightDriver>();

        if (_scenario.TestError is not null)
        {
            Console.WriteLine($"[Hooks] FAILED: {_scenario.TestError.Message}");
            var bytes = await driver.TakeScreenshotAsync();
            if (bytes.Length > 0)
            {
                var dir  = Path.Combine("reports", "screenshots");
                Directory.CreateDirectory(dir);
                var file = Path.Combine(dir,
                    $"{_scenario.ScenarioInfo.Title.Replace(" ", "_")}_{DateTime.Now:yyyyMMdd_HHmmss}.png");
                await File.WriteAllBytesAsync(file, bytes);
                Console.WriteLine($"[Hooks] Screenshot: {file}");
            }
        }

        driver.Dispose();
    }
}
