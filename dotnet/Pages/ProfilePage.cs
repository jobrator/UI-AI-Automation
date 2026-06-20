using Microsoft.Playwright;

namespace Jobrator.E2E.Tests.Pages;

public sealed class ProfilePage
{
    private readonly IPage  _page;
    private readonly string _baseUrl;

    private const string DeleteProfileButton =
        "button.btn-danger:has-text('Delete Profile'), button:has-text('Delete Profile')";

    // SweetAlert2 confirmation popup: "Are you sure? ... Yes, delete it!"
    private const string ConfirmDeleteButton =
        ".swal2-confirm, " +
        ".swal2-popup button:has-text('Yes, delete it'), " +
        ".modal.show button:has-text('Delete'), " +
        "[role='dialog'] button:has-text('Delete')";

    public ProfilePage(IPage page, string baseUrl)
    {
        _page    = page;
        _baseUrl = baseUrl.TrimEnd('/');
    }

    public async Task NavigateAsync()
    {
        await _page.GotoAsync($"{_baseUrl}/dashboard/profile",
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
        await _page.WaitForTimeoutAsync(1500);
        Console.WriteLine($"[ProfilePage] Profile URL: {_page.Url}");
    }

    public Task<bool> IsDeleteProfileVisibleAsync() =>
        _page.Locator(DeleteProfileButton).First.IsVisibleAsync();

    public async Task DeleteProfileAsync()
    {
        await _page.Locator(DeleteProfileButton).First.ClickAsync();
        Console.WriteLine("[ProfilePage] Clicked 'Delete Profile' — awaiting confirmation popup.");

        var confirm = _page.Locator(ConfirmDeleteButton).First;
        await confirm.WaitForAsync(new LocatorWaitForOptions
        {
            State   = WaitForSelectorState.Visible,
            Timeout = 10000
        });
        await confirm.ClickAsync();
        Console.WriteLine("[ProfilePage] Confirmed profile deletion ('Yes, delete it!').");

        await _page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        await _page.WaitForTimeoutAsync(4000);
        Console.WriteLine($"[ProfilePage] Post-deletion URL: {_page.Url}");
    }
}
