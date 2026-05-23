@authentication @password-reset
Feature: Password Reset
  As a registered candidate on Jobrator
  I want to reset my forgotten password using the forgot password flow
  So that I can regain access to my account using a new password

  Background:
    Given a new candidate account is registered with a temporary Mailinator email

  @smoke @positive @regression @TC_PR001
  Scenario: TC_PR001 — Candidate resets password via email link and logs in with new credentials
    Given the Jobrator login page is open
    When the user clicks the forgot password link
    And the candidate enters the registered temporary email in the forgot password form
    And the candidate submits the forgot password form
    Then a confirmation message should be shown on the forgot password page
    When the candidate opens the Mailinator inbox in a new tab
    And the candidate opens the Jobrator password reset email
    And the candidate follows the password reset link in the email
    And the candidate sets a new password on the reset page
    And the candidate logs in with the new password on the login page
    Then the candidate should be redirected to the dashboard after password reset
    And the user profile menu should be visible
