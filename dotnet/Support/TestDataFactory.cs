namespace Jobrator.E2E.Tests.Support;

public static class TestDataFactory
{
    private static readonly Random _rng = Random.Shared;

    private static readonly string[] _firstNames =
    [
        "Alex", "Jordan", "Casey", "Morgan", "Taylor", "Riley", "Quinn",
        "Avery", "Blake", "Cameron", "Dana", "Drew", "Emery", "Finley",
        "Harper", "Jamie", "Kendall", "Logan", "Parker", "Reese"
    ];

    private static readonly string[] _lastNames =
    [
        "Smith", "Jones", "Brown", "Davis", "Wilson", "Moore", "Taylor",
        "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin",
        "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Lewis"
    ];

    private const string LowerChars   = "abcdefghijklmnopqrstuvwxyz";
    private const string UpperChars   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private const string DigitChars   = "0123456789";
    private const string SpecialChars = "!@#$%&";

    public static CandidateData GenerateCandidate()
    {
        var firstName = _firstNames[_rng.Next(_firstNames.Length)];
        var lastName  = _lastNames[_rng.Next(_lastNames.Length)];
        var unique    = Guid.NewGuid().ToString("N")[..10];
        var email     = $"testcandidate+{unique}@mailinator.com";
        var password  = BuildPassword();

        return new CandidateData(firstName, lastName, email, password);
    }

    private static string BuildPassword()
    {
        var chars = new char[10];
        chars[0] = UpperChars[_rng.Next(UpperChars.Length)];
        chars[1] = UpperChars[_rng.Next(UpperChars.Length)];
        chars[2] = LowerChars[_rng.Next(LowerChars.Length)];
        chars[3] = LowerChars[_rng.Next(LowerChars.Length)];
        chars[4] = LowerChars[_rng.Next(LowerChars.Length)];
        chars[5] = LowerChars[_rng.Next(LowerChars.Length)];
        chars[6] = DigitChars[_rng.Next(DigitChars.Length)];
        chars[7] = DigitChars[_rng.Next(DigitChars.Length)];
        chars[8] = SpecialChars[_rng.Next(SpecialChars.Length)];
        chars[9] = SpecialChars[_rng.Next(SpecialChars.Length)];
        _rng.Shuffle(chars);
        return new string(chars);
    }
}

public sealed record CandidateData(
    string FirstName,
    string LastName,
    string Email,
    string Password);
