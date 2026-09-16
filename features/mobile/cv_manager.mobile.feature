@mobile @cv
Feature: CV manager on the Jobrator mobile app
  As a candidate
  I want to upload my CV from my device
  So that I can apply for jobs

  # Requires the CV file to be present on the device. Push it first:
  #   adb push test-data/cv/tc051-valid-cv.pdf /sdcard/Download/tc051-valid-cv.pdf
  # Override the location with MOBILE_CV_DEVICE_PATH / MOBILE_CV_DISPLAY_NAME.

  Background:
    Given the Jobrator mobile app is launched

  @ADO-29943 @positive @smoke
  Scenario: Verify Candidate CV Upload
    When user tap on the "Candidate" Get Started button
    And user navigate to "myjob" menu
    And user select "Candidate" signin option
    And "Candidate" login with email "valid_email" and password "valid_password"
    And user tap on signin button
    And user navigate to "more" menu
    And I tap on the CV Manager button
    And I tap on the CV Upload button
    And I am redirected to CV file location on my device
    And I select the document
    And I tap Submit button
    Then my CV should be uploaded successfully

  @ADO-28140 @regression
  Scenario: Uploaded CV appears in the list without refreshing the screen
    When user tap on the "Candidate" Get Started button
    And user navigate to "myjob" menu
    And user select "Candidate" signin option
    And "Candidate" login with email "valid_email" and password "valid_password"
    And user tap on signin button
    And user navigate to "more" menu
    And I tap on the CV Manager button
    And I tap on the CV Upload button
    And I am redirected to CV file location on my device
    And I select the document
    And I tap Submit button
    Then my CV should be uploaded successfully
    And the uploaded CV should appear in the list without refreshing the screen
