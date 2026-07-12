@candidate @profile
Feature: Candidate My Profile
  As a registered candidate on Jobrator
  I want to manage my personal profile information
  So that employers can find and review my details

  Background:
    Given the authenticated candidate navigates to the My Profile page

  @smoke @positive @regression @requires-candidate-login @TC_CP001
  Scenario: TC_CP001 — Profile page loads and displays all required form fields
    Then the first name field should be visible on the profile page
    And the last name field should be visible on the profile page
    And the phone number field should be visible on the profile page
    And the gender dropdown should be visible on the profile page
    And the date of birth field should be visible on the profile page
    And the country dropdown should be visible on the profile page
    And the state dropdown should be visible on the profile page
    And the city dropdown should be visible on the profile page
    And the skills multi-select field should be visible on the profile page

  @regression @positive @requires-candidate-login @TC_CP002
  Scenario: TC_CP002 — Candidate can update personal information and see a success message
    When the candidate updates the phone number field with a valid phone number
    And the candidate clicks the Save button on the profile page
    Then a success message should be displayed on the profile page
    And the updated phone number should be persisted on the profile page

  @regression @positive @requires-candidate-login @TC_CP003
  Scenario: TC_CP003 — Country, State, and City dropdowns are cascading
    When the candidate selects a country from the country dropdown
    Then the state dropdown should be populated with states for that country
    When the candidate selects a state from the state dropdown
    Then the city dropdown should be populated with cities for that state

  @regression @positive @requires-candidate-login @TC_CP004
  Scenario: TC_CP004 — Skills multi-select allows searching and adding skills as tags
    When the candidate searches for a skill in the skills field
    And the candidate selects a skill from the dropdown suggestions
    Then the selected skill should appear as a tag in the skills field
    And the skill should be saved when the candidate clicks the Save button

  @regression @positive @requires-candidate-login @TC_CP005
  Scenario: TC_CP005 — Profile picture upload accepts JPG and PNG image formats
    When the candidate uploads a valid JPG profile picture
    Then the profile picture should be updated and displayed on the profile page
    When the candidate uploads a valid PNG profile picture
    Then the profile picture should be updated and displayed on the profile page

  @regression @positive @requires-candidate-login @TC_CP006
  Scenario: TC_CP006 — AI Generate Summary populates the career summary field
    When the candidate clicks the Generate via AI button on the profile summary section
    Then an AI-generated career summary should be populated in the summary field

  @regression @positive @requires-candidate-login @TC_CP007
  Scenario: TC_CP007 — Delete Profile button shows a confirmation dialog before deletion
    When the candidate clicks the Delete Profile button
    Then a confirmation dialog should appear asking the candidate to confirm deletion
    When the candidate cancels the confirmation dialog
    Then the profile should not be deleted and the candidate should remain on the profile page

  @regression @negative @requires-candidate-login @TC_CP008
  Scenario: TC_CP008 — Required fields show validation errors when the form is submitted empty
    When the candidate clears all required fields on the profile page
    And the candidate clicks the Save button on the profile page
    Then validation errors should appear on the required fields

  @regression @positive @requires-candidate-login @TC_CP009
  Scenario: TC_CP009 — Profile data is retained between sessions after saving
    When the candidate updates the phone number field with a unique valid phone number
    And the candidate clicks the Save button on the profile page
    Then a success message should be displayed on the profile page
    When the candidate logs out and logs back in
    And the candidate navigates to the My Profile page
    Then the previously saved phone number should be present on the profile page
