@authentication @login
Feature: User Authentication — Login
  As a registered candidate on Jobrator
  I want to log into my account using my email and password
  So that I can access my candidate profile and manage my job applications

  Background:
    Given the Jobrator login page is open

  @smoke @positive @regression @TC001
  Scenario: TC001 — Successful login with valid candidate credentials
    When the user enters email "candidatejobrator+tosin@gmail.com"
    And the user enters password "Tester@12"
    And the user clicks the login button
    Then the user should be redirected to the candidate dashboard
    And the user profile menu should be visible

  @smoke @positive @regression @TC002
  Scenario: TC002 — Login page loads and displays required elements
    Then the email input field should be visible
    And the password input field should be visible
    And the login submit button should be visible
    And the forgot password link should be visible

  @negative @regression @TC003
  Scenario: TC003 — Login fails with an incorrect password
    When the user enters email "candidatejobrator+tosin@gmail.com"
    And the user enters password "WrongPassword999"
    And the user clicks the login button
    Then an authentication error message should be displayed
    And the user should remain on the login page

  @negative @regression @TC004
  Scenario: TC004 — Login fails with a non-existent email address
    When the user enters email "ghost.user.9999@nonexistent.io"
    And the user enters password "Tester@12"
    And the user clicks the login button
    Then an authentication error message should be displayed
    And the user should remain on the login page

  @negative @regression @TC005
  Scenario: TC005 — Login fails when email field is left empty
    When the user leaves the email field empty
    And the user enters password "Tester@12"
    And the user clicks the login button
    Then an email validation error should be shown

  @negative @regression @TC006
  Scenario: TC006 — Login fails when password field is left empty
    When the user enters email "candidatejobrator+tosin@gmail.com"
    And the user leaves the password field empty
    And the user clicks the login button
    Then a password validation error should be shown

  @negative @regression @TC007
  Scenario: TC007 — Login fails when both fields are empty
    When the user leaves the email field empty
    And the user leaves the password field empty
    And the user clicks the login button
    Then form field validation errors should be displayed

  @negative @regression @TC008
  Scenario Outline: TC008 — Login fails with malformed email addresses
    When the user enters email "<invalid_email>"
    And the user enters password "Tester@12"
    And the user clicks the login button
    Then an email format validation error should be shown

    Examples:
      | invalid_email       |
      | notanemail          |
      | @jobrator.com       |
      | user@               |
      | user @jobrator.com  |
      | user..name@test.com |

  @negative @regression @TC009
  Scenario: TC009 — Login fails with correct email but wrong-case password
    When the user enters email "candidatejobrator+tosin@gmail.com"
    And the user enters password "tester@12"
    And the user clicks the login button
    Then an authentication error message should be displayed
    And the user should remain on the login page

  @boundary @regression @TC010
  Scenario: TC010 — System handles a maximum-length email gracefully
    When the user enters a maximum length email address of 254 characters
    And the user enters password "Tester@12"
    And the user clicks the login button
    Then the application should respond without crashing or throwing a server error

  @boundary @regression @TC011
  Scenario: TC011 — System handles a very long password gracefully
    When the user enters email "candidatejobrator+tosin@gmail.com"
    And the user enters a password that is 256 characters long
    And the user clicks the login button
    Then the application should respond without crashing or throwing a server error

  @boundary @regression @TC012
  Scenario: TC012 — System handles a single-character password
    When the user enters email "candidatejobrator+tosin@gmail.com"
    And the user enters password "a"
    And the user clicks the login button
    Then an authentication error message should be displayed

  @security @owasp @regression @TC013
  Scenario: TC013 — OWASP A03 — SQL Injection via email field
    When the user enters SQL injection payload "' OR '1'='1'; --" in the email field
    And the user enters password "anything"
    And the user clicks the login button
    Then the SQL injection attempt should be rejected
    And the user should not be authenticated

  @security @owasp @regression @TC014
  Scenario: TC014 — OWASP A03 — SQL Injection via password field
    When the user enters email "candidatejobrator+tosin@gmail.com"
    And the user enters SQL injection payload "' OR 1=1 --" in the password field
    And the user clicks the login button
    Then the SQL injection attempt should be rejected
    And the user should not be authenticated

  @security @owasp @regression @TC015
  Scenario: TC015 — OWASP A03 — Stored XSS attempt via email field
    When the user enters XSS payload "<script>alert('XSS')</script>" in the email field
    And the user enters password "anything"
    And the user clicks the login button
    Then the XSS payload should be sanitised and not executed
    And no browser alert dialog should appear

  @security @owasp @regression @TC016
  Scenario: TC016 — OWASP A02 — Password field must mask input
    When the user enters password "Tester@12"
    Then the password input field should have type "password"
    And the entered password text should not be visible in plaintext

  @security @owasp @regression @TC017
  Scenario: TC017 — OWASP A02 — Login page must be served over HTTPS
    Then the page URL should use the HTTPS protocol

  @security @owasp @regression @TC018
  Scenario: TC018 — OWASP A01 — Credentials must not appear in the URL
    When the user enters email "candidatejobrator+tosin@gmail.com"
    And the user enters password "Tester@12"
    And the user clicks the login button
    Then the resulting URL should not contain any credentials or sensitive tokens

  @security @owasp @regression @TC019
  Scenario: TC019 — OWASP A07 — Brute force protection after multiple failures
    When the user submits incorrect credentials 5 times in a row
    Then the account should be locked out or a CAPTCHA challenge should appear

  @security @owasp @regression @TC020
  Scenario: TC020 — OWASP A07 — Verbose error messages do not enumerate valid emails
    When the user enters email "nonexistent_12345@fake.io"
    And the user enters password "wrongpassword"
    And the user clicks the login button
    Then the error message should be generic and should not confirm email existence

  @security @owasp @regression @TC021
  Scenario Outline: TC021 — OWASP A03 — Common injection payloads are rejected
    When the user enters email "<payload>"
    And the user enters password "anything"
    And the user clicks the login button
    Then the injection attempt should be rejected safely

    Examples:
      | payload                         |
      | 1' OR '1' = '1                  |
      | admin'--                        |
      | admin'/*                        |
      | <img src=x onerror=alert(1)>    |
      | javascript:alert('xss')         |

  @session @regression @TC022 @requires-login
  Scenario: TC022 — User can successfully log out
    When the user logs out of the application
    Then the user should be redirected to the login page
    And the authenticated session should be terminated

  @session @regression @TC023
  Scenario: TC023 — Unauthenticated user is redirected to login page
    When an unauthenticated user navigates directly to the candidate dashboard
    Then they should be redirected to the login page

  @session @regression @TC024 @requires-login
  Scenario: TC024 — Accessing login page while already logged in redirects to dashboard
    When the authenticated user navigates directly to the login page
    Then they should be redirected to the candidate dashboard

  @ui @regression @TC025
  Scenario: TC025 — Login page loads within acceptable performance threshold
    Then the login page should load within 5 seconds

  @ui @regression @TC026
  Scenario: TC026 — Forgot password link is present and navigates correctly
    When the user clicks the forgot password link
    Then the user should be navigated to the password reset page

  @ui @regression @TC027
  Scenario: TC027 — Enter key on password field submits the login form
    When the user enters email "candidatejobrator+tosin@gmail.com"
    And the user enters password "WrongPassword"
    And the user presses Enter on the password field
    Then the login form should be submitted
    And an error message should be shown

  @ui @regression @TC028
  Scenario: TC028 — Tab navigation moves focus between email and password fields
    When the user clicks on the email input field
    And the user presses the Tab key
    Then the focus should move to the password input field
