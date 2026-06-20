@public @browse-jobs
Feature: Browse Jobs — Public Job Listing Page
  As a visitor to Jobrator
  I want to browse and search for job listings without needing to log in
  So that I can find relevant opportunities before registering

  Background:
    Given the user navigates to the public jobs listing page

  @smoke @positive @regression @TC_JOBS001
  Scenario: TC_JOBS001 — Job listings page renders job cards without authentication
    Then job listing cards should be displayed on the page
    And each card should show a job title
    And each card should show a company name
    And the filter panel should be visible on the page

  @regression @positive @TC_JOBS002
  Scenario: TC_JOBS002 — Keyword search filters the job listings
    When the user enters "Software Engineer" in the job title search field
    And the user clicks the Filter button
    Then only job listings matching "Software Engineer" should be displayed

  @regression @positive @TC_JOBS003
  Scenario: TC_JOBS003 — Location search filters the job listings
    When the user enters "Lagos" in the location search field
    And the user clicks the Filter button
    Then only job listings from "Lagos" should be displayed

  @regression @positive @TC_JOBS004
  Scenario: TC_JOBS004 — Job Type dropdown filters job listings
    When the user selects a job type from the Job Type dropdown
    And the user clicks the Filter button
    Then job listings should be filtered to the selected job type

  @regression @positive @TC_JOBS005
  Scenario Outline: TC_JOBS005 — Work Mode dropdown filters job listings
    When the user selects "<work_mode>" from the Work Mode dropdown
    And the user clicks the Filter button
    Then only job listings with the work mode "<work_mode>" should be displayed

    Examples:
      | work_mode |
      | Remote    |
      | Hybrid    |
      | On-site   |

  @regression @positive @TC_JOBS006
  Scenario: TC_JOBS006 — Clear All resets all applied filters and restores the full listing
    Given the user has applied a keyword filter "Developer"
    When the user clicks the Clear All button
    Then all filter values should be reset
    And the full job listing should be restored

  @smoke @regression @positive @TC_JOBS007
  Scenario: TC_JOBS007 — Clicking a job card without authentication redirects to login
    Given the user is not logged in
    When the user clicks on a job listing card
    Then the user should be redirected to the login page

  @regression @positive @requires-candidate-login @TC_JOBS008
  Scenario: TC_JOBS008 — Authenticated candidate can view full job detail after clicking a listing
    Given the candidate is logged in and navigates to the jobs listing page
    When the candidate clicks on a job listing card
    Then the job detail page should load
    And the job title should be visible
    And the job description should be visible
    And the employer name should be visible
    And the Apply button should be visible

  @regression @positive @requires-candidate-login @TC_JOBS009
  Scenario: TC_JOBS009 — Authenticated candidate can apply to a job from the job detail page
    Given the candidate is logged in and navigates to the jobs listing page
    And the candidate opens a job detail page that they have not yet applied to
    When the candidate clicks the Apply button
    Then the application should be submitted
    And a confirmation message or indicator should be shown

  @regression @positive @requires-candidate-login @TC_JOBS010
  Scenario: TC_JOBS010 — Apply button is disabled or shows Applied when candidate has already applied
    Given the candidate is logged in and has already applied to a job
    When the candidate navigates to that job detail page
    Then the Apply button should be disabled or display an "Applied" label
