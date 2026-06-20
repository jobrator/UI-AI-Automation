@registration @candidate
Feature: Candidate Registration
  As a new user on Jobrator
  I want to register as a candidate
  So that I can access job listings and manage my applications

  Background:
    Given the Jobrator registration page is open

  @smoke @positive @regression @TC_REG001
  Scenario: TC_REG001 - Successful registration with randomly generated candidate data
    When the user fills in the registration form with random valid data
    And the user submits the registration form
    Then the registration should be successful

  @smoke @positive @regression @TC_REG002
  Scenario: TC_REG002 - Registration page displays all required form elements
    Then the first name input field should be visible
    And the last name input field should be visible
    And the registration email input field should be visible
    And the registration password input field should be visible
    And the confirm password input field should be visible
    And the registration submit button should be visible
    And the login link should be visible on the registration page

  @negative @regression @TC_REG003
  Scenario: TC_REG003 - Registration fails when the email address is already registered
    When the user fills in the registration form with a known registered email
    And the user submits the registration form
    Then a registration error message should be displayed
    And the user should remain on the registration page

  @negative @regression @TC_REG004
  Scenario: TC_REG004 - Registration fails when passwords do not match
    When the user fills in the registration form with random valid data
    And the user enters a mismatched confirmation password
    And the user submits the registration form
    Then a registration error message should be displayed

  @negative @regression @TC_REG005
  Scenario: TC_REG005 - Registration fails when all required fields are left empty
    When the user submits the registration form without filling any fields
    Then a registration error message should be displayed
    And the user should remain on the registration page

  @negative @regression @TC_REG006
  Scenario: TC_REG006 - Registration fails with a malformed email address
    When the user fills in the registration form with random valid data
    And the user overrides the email with an invalid value "not-a-valid-email"
    And the user submits the registration form
    Then a registration error message should be displayed

  @boundary @negative @regression @TC_REG007
  Scenario: TC_REG007 - Registration fails with a password that is too short
    When the user fills in the registration form with random valid data
    And the user overrides the password with a too-short value "Ab1!"
    And the user submits the registration form
    Then a registration error message should be displayed

  @boundary @negative @regression @TC_REG008
  Scenario: TC_REG008 - Registration fails with a plain-text password lacking complexity
    When the user fills in the registration form with random valid data
    And the user overrides the password with a plain value "simplepassword"
    And the user submits the registration form
    Then a registration error message should be displayed

  @security @regression @TC_REG009
  Scenario: TC_REG009 - Password and confirm password fields are masked
    Then the registration password field should be of type password
    And the confirm password field should be of type password

  @security @regression @TC_REG010
  Scenario: TC_REG010 - Registration page is served over HTTPS
    Then the registration page should be served over HTTPS

  @security @regression @TC_REG011
  Scenario: TC_REG011 - Email field rejects SQL injection payload
    When the user fills in the registration form with random valid data
    And the user overrides the email with an invalid value "' OR '1'='1"
    And the user submits the registration form
    Then a registration error message should be displayed
    And the user should remain on the registration page

  @security @regression @TC_REG012
  Scenario: TC_REG012 - First name field sanitises XSS payload on submission
    When the user fills in the registration form with the XSS payload "<script>alert('xss')</script>" in the first name
    And the user submits the registration form
    Then the XSS script should not have executed
    And a registration error message should be displayed

  @ui @regression @TC_REG013
  Scenario: TC_REG013 - Login link on registration page navigates to the login page
    When the user clicks the login link on the registration page
    Then the login page should be displayed

  @e2e @positive @regression @TC_REG014
  Scenario: TC_REG014 - A candidate can create an account and delete it from their profile
    When the user fills in the registration form with random valid data
    And the user submits the registration form
    Then the registration should be successful
    When the candidate logs in with the newly registered account
    And the candidate deletes their profile from the profile page
    Then the deleted account should no longer be able to log in
