@mobile @auth
Feature: Candidate authentication on the Jobrator mobile app
  As a candidate
  I want to sign in from the mobile app
  So that I can reach my jobs

  # Scenarios transcribed from the Sprint 54 ADO bugs so a device run reports
  # against the same steps the bugs were filed with.

  Background:
    Given the Jobrator mobile app is launched

  @ADO-29941 @positive @smoke
  Scenario: Verify Candidate Can Login from My Job Screen
    When user tap on the "Candidate" Get Started button
    And user navigate to "myjob" menu
    And user select "Candidate" signin option
    And "Candidate" login with email "valid_email" and password "valid_password"
    And user tap on signin button
    And user tap ok button on Login Modal prompt
    Then user should see my jobs screen

  @ADO-29945 @negative
  Scenario: Candidate sees an invalid-credential modal when the password is wrong
    When user tap on the "Candidate" Get Started button
    And user navigate to "myjob" menu
    And user select "Candidate" signin option
    And "Candidate" login with email "valid_email" and password "DefinitelyWrong@123"
    And user tap on signin button
    Then user should see an invalid credential modal
    And user should remain on the sign in screen
