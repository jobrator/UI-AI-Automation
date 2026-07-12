@candidate @vnin
Feature: Candidate VNIN Verification
  As a registered candidate on Jobrator
  I want to verify my identity using my Virtual National Identification Number (VNIN)
  So that my profile is marked as verified and trusted by employers

  Background:
    Given the authenticated candidate navigates to the VNIN Verification page

  @smoke @positive @regression @requires-candidate-login @TC_VN001
  Scenario: TC_VN001 — VNIN verification page renders all required form fields
    Then the first name field should be visible on the VNIN verification page
    And the middle name field should be visible on the VNIN verification page
    And the surname field should be visible on the VNIN verification page
    And the gender field should be visible on the VNIN verification page
    And the date of birth field should be visible on the VNIN verification page
    And the trusted phone number field should be visible on the VNIN verification page
    And the VNIN number field should be visible on the VNIN verification page
    And the Verify button should be visible on the VNIN verification page

  @regression @positive @requires-candidate-login @TC_VN002
  Scenario: TC_VN002 — Verification succeeds when valid VNIN credentials are submitted
    When the candidate fills in the VNIN form with valid credentials
    And the candidate clicks the Verify button
    Then the verification should succeed
    And the candidate's verification status should be updated to Verified

  @regression @negative @requires-candidate-login @TC_VN003
  Scenario: TC_VN003 — Verification fails when an incorrect VNIN number is submitted
    When the candidate fills in the VNIN form with an invalid VNIN number
    And the candidate clicks the Verify button
    Then an appropriate error message should be displayed on the VNIN verification page

  @regression @negative @requires-candidate-login @TC_VN004
  Scenario: TC_VN004 — Validation errors appear when the VNIN form is submitted empty
    When the candidate clicks the Verify button without filling any fields
    Then validation errors should appear on all required VNIN form fields

  @regression @positive @requires-candidate-login @TC_VN005
  Scenario: TC_VN005 — Verified badge is displayed on the dashboard after successful VNIN verification
    Given the candidate has successfully completed VNIN verification
    When the candidate navigates to the dashboard
    Then a Verified badge should be displayed on the candidate's profile or dashboard
