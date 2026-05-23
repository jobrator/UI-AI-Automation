using Microsoft.Extensions.Configuration;

namespace Jobrator.E2E.Tests.Support;

public sealed class EnvConfig
{
    private static EnvConfig? _instance;
    private readonly IConfiguration _cfg;

    private EnvConfig()
    {
        _cfg = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build();
    }

    public static EnvConfig Instance => _instance ??= new EnvConfig();

    public string JobratorSite     => _cfg["Jobrator:Site"]             ?? "https://jobrator.com/";
    public string CandidateEmail   => _cfg["Jobrator:CandidateEmail"]   ?? _cfg["CANDIDATE_EMAIL"]   ?? "";
    public string CandidatePassword=> _cfg["Jobrator:CandidatePassword"]?? _cfg["CANDIDATE_PASSWORD"]?? "";
    public string BrowserType      => _cfg["Browser:Type"]              ?? _cfg["BROWSER"]            ?? "chromium";
    public bool   Headless         => bool.Parse(_cfg["Browser:Headless"]  ?? _cfg["HEADLESS"]  ?? "false");
    public int    SlowMo           => int.Parse(_cfg["Browser:SlowMo"]     ?? "0");
    public int    DefaultTimeout   => int.Parse(_cfg["Timeouts:Default"]   ?? "30000");
    public int    NavigationTimeout=> int.Parse(_cfg["Timeouts:Navigation"]?? "60000");
    public int    ExpectTimeout    => int.Parse(_cfg["Timeouts:Expect"]    ?? "10000");
}
