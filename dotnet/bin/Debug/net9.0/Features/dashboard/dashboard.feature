@dashboard
Feature: Candidate Dashboard
  As a registered candidate on Jobrator
  I want to access my personalised dashboard after logging in
  So that I can manage my job applications, update my profile, and find new opportunities

  Rule: Authenticated candidate interacting with the dashboard

    Background:
      Given the authenticated candidate is on the dashboard

    @smoke @positive @regression @requires-login @TC029
    Scenario: TC029 — Dashboard loads and renders the candidate home page
      Then the dashboard page should be fully loaded
      And the dashboard page title should indicate the candidate area

    @smoke @positive @regression @requires-login @TC030
    Scenario: TC030 — Dashboard displays the main navigation menu with key links
      Then the main site navigation should be visible on the dashboard
      And the navigation should contain a link to find jobs
      And the navigation should contain a link to job applications

    @smoke @positive @regression @requires-login @TC031
    Scenario: TC031 — Dashboard displays a personalised welcome greeting
      Then a welcome greeting or candidate name should be visible on the dashboard

    @smoke @positive @regression @requires-login @TC032
    Scenario: TC032 — Logout control is accessible from the dashboard
      Then the logout button or link should be visible on the dashboard

    @regression @positive @requires-login @TC033
    Scenario: TC033 — Clicking Find Jobs navigates to the job search page
      When the candidate clicks the find jobs link in the navigation
      Then the browser should navigate to the job search section

    @regression @positive @requires-login @TC034
    Scenario: TC034 — Clicking My Applications navigates to the applications listing
      When the candidate clicks the my applications link in the navigation
      Then the browser should navigate to the job applications section

    @regression @positive @requires-login @TC035
    Scenario: TC035 — Clicking My Profile navigates to the profile settings page
      When the candidate clicks the my profile link in the navigation
      Then the browser should navigate to the candidate profile section

    @regression @positive @requires-login @TC036
    Scenario: TC036 — Applications section is rendered on the dashboard
      Then the applications section should be present on the dashboard page

    @regression @positive @requires-login @TC037
    Scenario: TC037 — Application entries display job title and status information
      Then each visible application entry should display a job title
      And each visible application entry should display a status indicator

    @regression @positive @requires-login @TC038
    Scenario Outline: TC038 — Application section correctly renders known status labels
      Then the applications section should be capable of displaying the "<status>" status label

      Examples:
        | status    |
        | Pending   |
        | Reviewed  |
        | Rejected  |
        | Shortlist |

    @regression @profile @positive @requires-login @TC039
    Scenario: TC039 — CV or Resume upload control is accessible from the dashboard
      Then the CV upload link or button should be present on the dashboard

    @regression @profile @positive @requires-login @TC040
    Scenario: TC040 — Profile completion indicator is visible to the candidate
      Then the profile completion indicator or section should be visible on the dashboard

    @regression @profile @positive @requires-login @TC041
    Scenario: TC041 — User avatar or profile photo element is displayed
      Then the user avatar or profile image element should be visible on the dashboard

    @regression @session @requires-login @TC042
    Scenario: TC042 — Refreshing the dashboard retains the authenticated session
      When the candidate refreshes the dashboard page
      Then the candidate should still be authenticated after the refresh
      And the dashboard content should remain visible after refresh

    @regression @session @requires-login @TC043
    Scenario: TC043 — Logging out from the dashboard terminates the session
      When the candidate clicks the logout control on the dashboard
      Then the candidate should land on the login page after logout

    @regression @ui @requires-login @TC044
    Scenario: TC044 — Dashboard page loads within an acceptable time threshold
      Then the dashboard page should have loaded within 8 seconds

    @regression @ui @requires-login @TC045
    Scenario: TC045 — Dashboard is served over a secure HTTPS connection
      Then the dashboard page URL should begin with HTTPS

    @regression @security @owasp @a01-access-control @requires-login @TC046
    Scenario: TC046 — OWASP A01 — No sensitive data is exposed in the dashboard URL
      Then the dashboard page URL should not expose any sensitive tokens or user credentials

    @regression @security @owasp @a02-cryptographic @requires-login @TC047
    Scenario: TC047 — OWASP A02 — Session cookie carries Secure and HttpOnly flags
      Then the authentication session cookie should have the Secure flag set
      And the authentication session cookie should have the HttpOnly flag set

    @regression @security @owasp @a03-injection @requires-login @TC048
    Scenario: TC048 — OWASP A03 — XSS payload entered in the dashboard search field is sanitised
      When the candidate enters XSS payload "<script>alert('dashboard-xss')</script>" in the dashboard search field
      Then the XSS script should not execute on the dashboard
      And no alert dialog should have been triggered on the dashboard

  Rule: Unauthenticated access to the dashboard is blocked

    Background:
      Given no active browser session exists for the dashboard tests

    @regression @security @owasp @a01-access-control @TC049
    Scenario: TC049 — OWASP A01 — Accessing the dashboard URL without a session redirects to login
      When a user without an active session navigates directly to the dashboard URL
      Then the application should deny access and redirect to the login page

    @regression @security @owasp @a07-authn-failures @TC050
    Scenario: TC050 — OWASP A07 — Dashboard rejects requests carrying an invalid session token
      When a user navigates to the dashboard with a forged session cookie value
      Then the application should reject the forged session and redirect to the login page
