@admin @admin-login
Feature: Admin Portal Login
  As a platform administrator
  I want to log into the Jobrator admin console
  So that I can manage platform data, users, and configuration

  Background:
    Given the user navigates to the Jobrator admin login page at admin.jobrator.com

  @smoke @positive @regression @TC_ADM001
  Scenario: TC_ADM001 — Admin login page renders with Username and Password fields
    Then the admin login page should display a username field
    And the admin login page should display a password field
    And the admin login page should display a Submit or Login button

  @smoke @positive @regression @TC_ADM002
  Scenario: TC_ADM002 — Admin logs in successfully with valid credentials
    When the admin enters the valid admin username
    And the admin enters the valid admin password
    And the admin clicks the Submit button
    Then the admin should be redirected to the admin dashboard

  @regression @negative @TC_ADM003
  Scenario: TC_ADM003 — Admin login fails when invalid credentials are submitted
    When the admin enters "wrongadmin" as the username
    And the admin enters "wrongpassword" as the password
    And the admin clicks the Submit button
    Then an error message should be displayed on the admin login page
    And no redirect to the admin dashboard should occur

  @smoke @positive @regression @TC_ADM004
  Scenario: TC_ADM004 — Admin dashboard displays platform statistics after successful login
    When the admin enters the valid admin username
    And the admin enters the valid admin password
    And the admin clicks the Submit button
    Then the admin dashboard should load with platform statistics
    And the statistics should include total Users count
    And the statistics should include total Candidates count
    And the statistics should include total Companies count
