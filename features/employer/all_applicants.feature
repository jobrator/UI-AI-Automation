@employer @applicants
Feature: Employer All Applicants
  As a registered employer on Jobrator
  I want to review and manage all candidate applications across my job postings
  So that I can progress candidates through the hiring pipeline

  # NOTE: Candidate applications must exist for this feature to be testable.
  # See features/journeys/job_application_journey.feature for the full cross-portal setup.

  Background:
    Given the authenticated employer navigates to the All Applicants page

  @smoke @positive @regression @requires-employer-login @TC_AA001
  Scenario: TC_AA001 — All Applicants page lists applications across all employer job posts
    Then all candidate applications should be listed on the all applicants page
    And each application entry should display the candidate name
    And each application entry should display the job title
    And each application entry should display the date of application
    And each application entry should display the application status

  @regression @positive @requires-employer-login @TC_AA002
  Scenario: TC_AA002 — Employer can view the candidate profile from the application list
    Given the employer has at least one candidate application
    When the employer clicks the candidate name or profile link on an application entry
    Then the candidate profile page should load
    And the candidate CV or skills information should be visible

  @regression @positive @requires-employer-login @TC_AA003
  Scenario Outline: TC_AA003 — Employer can update the application status for a candidate
    Given the employer has at least one candidate application with Pending status
    When the employer changes the application status to "<new_status>"
    Then the application status should be updated to "<new_status>"
    And the updated status should be visible to the candidate on their Applied Jobs page

    Examples:
      | new_status  |
      | Reviewed    |
      | Shortlisted |
      | Rejected    |

  @regression @positive @requires-employer-login @TC_AA004
  Scenario: TC_AA004 — Employer can download the candidate CV from the application view
    Given the employer has at least one application where the candidate has uploaded a CV
    When the employer clicks the download CV action on that application
    Then the candidate CV file should be downloaded

  @regression @positive @requires-employer-login @TC_AA005
  Scenario: TC_AA005 — Employer can shortlist a candidate and they appear in Shortlisted CVs
    Given the employer has at least one candidate application
    When the employer selects the Shortlist action on a candidate application
    Then the candidate should appear on the Shortlisted CVs page

  @regression @positive @requires-employer-login @TC_AA006
  Scenario: TC_AA006 — Employer can reject a candidate application
    Given the employer has at least one candidate application
    When the employer selects the Reject action on a candidate application
    And the employer confirms the rejection
    Then the candidate application status should be updated to Rejected

  @regression @positive @requires-employer-login @TC_AA007
  Scenario Outline: TC_AA007 — Application list can be filtered by job or status
    Given the employer has multiple candidate applications
    When the employer applies the filter "<filter_type>"
    Then only matching applications should be displayed on the applicants page

    Examples:
      | filter_type       |
      | filter by job     |
      | filter by status  |
