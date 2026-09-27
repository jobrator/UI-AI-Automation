@mobile @security @change-password
Feature: Change password on the Jobrator mobile app
  As a candidate
  I want to change my password from the mobile app
  So that I control access to my account

  # Runs against a freshly-registered throwaway account, never the shared .env
  # candidate — a mid-scenario failure would otherwise strand the shared account
  # on a temporary password.

  Background:
    Given the Jobrator mobile app is launched

  @ADO-29944 @positive @requires-throwaway-candidate
  Scenario: Verify Candidate Can Change Password
    When user navigate to "more" menu
    And user tap on the Change Password option
    And user enter current password "valid_password"
    And user enter new password "random_password"
    And user confirm new password "random_password"
    And user tap on the Update Password button
    Then user should see password updated successfully popup
    And user revert password back to the original
