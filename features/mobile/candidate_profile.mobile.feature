@mobile @profile
Feature: Candidate profile on the Jobrator mobile app
  As a candidate
  I want to edit my profile from the mobile app
  So that employers see current information

  Background:
    Given the Jobrator mobile app is launched

  @ADO-29942 @positive @requires-candidate-login
  Scenario: Verify Candidate Can Edit Profile
    When user navigate to "more" menu
    And user tap on the My Profile
    And user edit Candidate "First Name" with "New Candidate First Name"
    And user edit Candidate "Last Name" with "New Candidate Last Name"
    And user edit Candidate "Mobile Number" with "08049004952"
    And user tap to select Candidate "Pronoun" and tap on Done
    And user tap to select Candidate "Date of Birth" and tap on Done
    And user edit Candidate "Address" with "New Candidate Address"
    And user tap to select Candidate "Country" and tap on Done
    And user edit Candidate "State" with "New Candidate State"
    And user edit Candidate "City" with "New Candidate City"
    And user edit Candidate "ZipCode" with "100001"
    And user tap to select Candidate "Gender" and tap on Done
    And user tap to select Candidate "Skills" and tap on Done
    And user edit Candidate "Summary" with "New Candidate Summary"
    And user tap the Save button
    Then user should see profile Updated Successfully popup screen
