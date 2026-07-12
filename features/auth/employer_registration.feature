@registration @employer
Feature: Employer Registration
  As a new employer on Jobrator
  I want to register a company account
  So that I can post job listings and manage candidate applications

  Background:
    Given the Jobrator employer registration page is open

  @smoke @positive @regression @TC_EREG001
  Scenario: TC_EREG001 - Successful registration with randomly generated employer data
    When the user fills in the employer registration form with random valid data
    And the user submits the employer registration form
    Then the employer registration should be successful

  @smoke @positive @regression @TC_EREG002
  Scenario: TC_EREG002 - Employer registration page displays all required form elements
    Then the company name input field should be visible
    And the employer phone number input field should be visible
    And the employer email input field should be visible
    And the employer registration password input field should be visible
    And the employer confirm password input field should be visible
    And the employer registration submit button should be visible
    And the login link should be visible on the employer registration page

  @negative @regression @TC_EREG003
  Scenario: TC_EREG003 - Registration fails when the email address is already registered
    When the user fills in the employer registration form with a known registered email
    And the user submits the employer registration form
    Then an employer registration error message should be displayed
    And the user should remain on the employer registration page

  @negative @regression @TC_EREG004
  Scenario: TC_EREG004 - Registration fails when passwords do not match
    When the user fills in the employer registration form with random valid data
    And the user enters a mismatched confirmation password in the employer form
    And the user submits the employer registration form
    Then an employer registration error message should be displayed

  @negative @regression @TC_EREG005
  Scenario: TC_EREG005 - Registration fails when all required fields are left empty
    When the user submits the employer registration form without filling any fields
    Then an employer registration error message should be displayed
    And the user should remain on the employer registration page

  @negative @regression @TC_EREG006
  Scenario: TC_EREG006 - Registration fails with a malformed email address
    When the user fills in the employer registration form with random valid data
    And the user overrides the employer email with an invalid value "not-a-valid-email"
    And the user submits the employer registration form
    Then an employer registration error message should be displayed

  @negative @regression @TC_EREG007
  Scenario: TC_EREG007 - Registration fails when company name field is left empty
    When the user fills in the employer registration form with random valid data
    And the user clears the company name field
    And the user submits the employer registration form
    Then an employer registration error message should be displayed

  @boundary @negative @regression @TC_EREG008
  Scenario: TC_EREG008 - Registration fails with a password that is too short
    When the user fills in the employer registration form with random valid data
    And the user overrides the employer password with a too-short value "Ab1!"
    And the user submits the employer registration form
    Then an employer registration error message should be displayed

  @boundary @negative @regression @TC_EREG009
  Scenario: TC_EREG009 - Registration fails with a plain-text password lacking complexity
    When the user fills in the employer registration form with random valid data
    And the user overrides the employer password with a plain value "simplepassword"
    And the user submits the employer registration form
    Then an employer registration error message should be displayed

  @security @regression @TC_EREG010
  Scenario: TC_EREG010 - Password and confirm password fields are masked
    Then the employer registration password field should be of type password
    And the employer confirm password field should be of type password

  @security @regression @TC_EREG011
  Scenario: TC_EREG011 - Employer registration page is served over HTTPS
    Then the employer registration page should be served over HTTPS

  @security @regression @TC_EREG012
  Scenario: TC_EREG012 - Email field rejects SQL injection payload
    When the user fills in the employer registration form with random valid data
    And the user overrides the employer email with an invalid value "' OR '1'='1"
    And the user submits the employer registration form
    Then an employer registration error message should be displayed
    And the user should remain on the employer registration page

  @security @regression @TC_EREG013
  Scenario: TC_EREG013 - Company name field sanitises XSS payload on submission
    When the user fills in the employer registration form with the XSS payload "<script>alert('xss')</script>" in the company name
    And the user submits the employer registration form
    Then the XSS script should not have executed
    And an employer registration error message should be displayed

  @ui @regression @TC_EREG014
  Scenario: TC_EREG014 - Login link on employer registration page navigates to the login page
    When the user clicks the login link on the employer registration page
    Then the login page should be displayed