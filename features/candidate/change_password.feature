@candidate @security @change-password
Feature: Candidate Change Password
  As a registered candidate on Jobrator
  I want to change my account password from the dashboard
  So that I can maintain the security of my account

  Background:
    Given the authenticated candidate navigates to the Change Password page

  @smoke @positive @regression @requires-candidate-login @TC_CHG001
  Scenario: TC_CHG001 — Change Password page renders the required form fields
    Then the Current Password field should be visible on the change password page
    And the New Password field should be visible on the change password page
    And the Confirm New Password field should be visible on the change password page
    And the Save button should be visible on the change password page

  @regression @positive @requires-throwaway-candidate @TC_CHG002
  Scenario: TC_CHG002 — Password change succeeds with the correct current password and a valid new password
    When the candidate enters the correct current password
    And the candidate enters a valid new password
    And the candidate confirms the new password
    And the candidate clicks the Save button on the change password page
    Then the password should be updated
    And a success confirmation message should be displayed

  @regression @negative @requires-candidate-login @TC_CHG003
  Scenario: TC_CHG003 — Password change fails when the current password entered is incorrect
    When the candidate enters an incorrect current password
    And the candidate enters a valid new password
    And the candidate confirms the new password
    And the candidate clicks the Save button on the change password page
    Then an error message should be displayed indicating the current password is wrong

  @regression @negative @requires-candidate-login @TC_CHG004
  Scenario: TC_CHG004 — Password change fails when the new password does not meet complexity requirements
    When the candidate enters the correct current password
    And the candidate enters a weak new password "simple"
    And the candidate confirms the new password
    And the candidate clicks the Save button on the change password page
    Then a password complexity validation error should be displayed

  @regression @negative @requires-candidate-login @TC_CHG005
  Scenario: TC_CHG005 — Password change fails when the new password and confirm password do not match
    When the candidate enters the correct current password
    And the candidate enters a valid new password
    And the candidate enters a different value in the confirm password field
    And the candidate clicks the Save button on the change password page
    Then a password mismatch validation error should be displayed
