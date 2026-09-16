@mobile @employer @company-profile
Feature: Company profile on the Jobrator mobile app
  As an employer
  I want to edit my company profile from the mobile app
  So that candidates see accurate company information

  Background:
    Given the Jobrator mobile app is launched

  @ADO-29946 @positive @requires-employer-login
  Scenario: Verify Employer Can Edit Profile
    When user navigate to "more" menu
    And user tap on the company Profile
    And user edit Company "Company Name" with "New Company Name"
    And user edit Company "About Company" with "New Company Description"
    And user edit Company "Company Location" with "New Company Location"
    And user tap on Save button
    And user tap OK on profile Updated Successfully popup screen
    Then user should see more screen
