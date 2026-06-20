@candidate @interviews
Feature: Candidate Scheduled Interviews
  As a registered candidate on Jobrator
  I want to view my scheduled interviews
  So that I can prepare and attend them at the right time and location

  # NOTE: A scheduled interview requires an employer to have shortlisted the candidate
  # and used the Schedule Interview action. See features/journeys/job_application_journey.feature
  # for the full cross-portal setup flow.

  Background:
    Given the authenticated candidate navigates to the Scheduled Interviews page

  @smoke @positive @regression @requires-candidate-login @TC_CI001
  Scenario: TC_CI001 — Scheduled interviews page displays full interview details
    Given an employer has scheduled an interview for the candidate
    Then the interview details should be visible on the scheduled interviews page
    And each interview entry should display the job title
    And each interview entry should display the employer name
    And each interview entry should display the interview date and time
    And each interview entry should display the interview location or meeting link

  @regression @positive @requires-candidate-login @TC_CI002
  Scenario: TC_CI002 — Empty state is shown when the candidate has no scheduled interviews
    Given the candidate account has no scheduled interviews
    When the candidate navigates to the Scheduled Interviews page
    Then an appropriate empty state message should be displayed on the interviews page

  @regression @ui @requires-candidate-login @TC_CI003
  Scenario: TC_CI003 — Scheduled interviews page is accessible from the dashboard sidebar
    Given the authenticated candidate is on the dashboard
    When the candidate clicks the Scheduled Interviews link in the dashboard sidebar
    Then the candidate should be navigated to the Scheduled Interviews page
