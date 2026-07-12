@candidate @applied-jobs
Feature: Candidate Applied Jobs
  As a registered candidate on Jobrator
  I want to view all the jobs I have applied to
  So that I can track the status of my job applications

  # NOTE: This feature depends on the employer having at least one published job.
  # See features/journeys/job_application_journey.feature for the full cross-portal flow.

  Background:
    Given the authenticated candidate navigates to the Applied Jobs page

  @smoke @positive @regression @requires-candidate-login @TC_AJ001
  Scenario: TC_AJ001 — Applied jobs list loads and displays all submitted applications
    Then all submitted applications should be listed on the applied jobs page
    And each application entry should display a job title
    And each application entry should display a company name
    And each application entry should display the date of application
    And each application entry should display the application status

  @regression @positive @requires-candidate-login @TC_AJ002
  Scenario Outline: TC_AJ002 — Application status labels are correctly displayed for each possible status
    Then the applied jobs page should be capable of displaying the "<status>" status label

    Examples:
      | status      |
      | Pending     |
      | Reviewed    |
      | Shortlisted |
      | Rejected    |

  @regression @positive @requires-candidate-login @TC_AJ003
  Scenario: TC_AJ003 — Candidate can open the job detail from the applied jobs list
    Given the candidate has at least one submitted application
    When the candidate clicks the job title link on an application entry
    Then the job detail page should load with the full job description

  @regression @positive @requires-candidate-login @TC_AJ004
  Scenario: TC_AJ004 — Empty state message is shown when the candidate has no applications
    Given the candidate account has no submitted job applications
    When the candidate navigates to the Applied Jobs page
    Then an appropriate empty state message should be displayed
