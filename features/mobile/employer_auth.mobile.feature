@mobile @auth @employer
Feature: Employer authentication on the Jobrator mobile app
  As an employer
  I want invalid sign-in attempts to be rejected
  So that company accounts stay protected

  Background:
    Given the Jobrator mobile app is launched

  @ADO-29947 @negative
  Scenario Outline: Verify Employer Cannot Login with wrong formatted credential
    When user tap on the "Employer" Get Started button
    And user navigate to "application" menu
    And user select "Employer" signin option
    And "Employer" login with email "<Email>" and password "<Password>"
    And user tap on signin button
    Then user should see error on the login screen

    Examples:
      | Email                  | Password        |
      | plainaddress           | Password@123    |
      | missing-at-sign.com    | Password@123    |
      | employer@              | Password@123    |
      | @nodomain.com          | Password@123    |
      | employer@nodomain      | Password@123    |
