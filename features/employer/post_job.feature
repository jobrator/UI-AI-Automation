@employer @post-job
Feature: Employer Post A New Job
  As a registered employer on Jobrator
  I want to post new job vacancies on the platform
  So that candidates can find and apply for positions at my company

  # NOTE: Skills and Industries must exist in the admin reference data before
  # they can be selected when posting a job. See features/admin/admin_reference_data.feature.

  Background:
    Given the authenticated employer navigates to the Post A New Job page

  @smoke @positive @regression @requires-employer-login @TC_PJ001
  Scenario: TC_PJ001 — Post Job form renders all required fields
    Then the job title field should be visible on the post job form
    And the job description field should be visible
    And the job location field should be visible
    And the salary field should be visible
    And the benefits field should be visible
    And the responsibilities field should be visible
    And the industry dropdown should be visible
    And the skills multi-select field should be visible
    And the employment type dropdown should be visible
    And the work mode dropdown should be visible
    And the opening date field should be visible
    And the closing date field should be visible

  @smoke @positive @regression @requires-employer-login @TC_PJ002
  Scenario: TC_PJ002 — Employer can publish a job successfully and it appears on the public jobs page
    When the employer fills in all required job fields with valid data
    And the employer clicks the Publish button on the post job form
    Then the job should be published successfully
    And the new job listing should appear on the public jobs page

  @regression @positive @requires-employer-login @TC_PJ003
  Scenario: TC_PJ003 — Employer can save a job as a draft which is not visible in public listings
    When the employer fills in partial job details
    And the employer clicks the Save as Draft button
    Then the job should be saved with draft status
    And the draft job should not appear on the public jobs listing page

  @regression @negative @requires-employer-login @TC_PJ004
  Scenario: TC_PJ004 — Job post submission fails and shows validation errors when required fields are missing
    When the employer submits the post job form without filling any required fields
    Then validation errors should appear on all required job form fields

  @regression @positive @requires-employer-login @TC_PJ005
  Scenario Outline: TC_PJ005 — Employment Type dropdown contains the expected options
    When the employer opens the Employment Type dropdown
    Then the option "<employment_type>" should be available in the Employment Type dropdown

    Examples:
      | employment_type |
      | Full-time       |
      | Part-time       |
      | Contract        |
      | Internship      |

  @regression @positive @requires-employer-login @TC_PJ006
  Scenario Outline: TC_PJ006 — Work Mode dropdown contains the expected options
    When the employer opens the Work Mode dropdown
    Then the option "<work_mode>" should be available in the Work Mode dropdown

    Examples:
      | work_mode |
      | Remote    |
      | Hybrid    |
      | On-site   |

  @regression @positive @requires-employer-login @TC_PJ007
  Scenario: TC_PJ007 — Skills multi-select allows adding multiple skills as tags on the post job form
    When the employer searches for a skill in the post job skills field
    And the employer selects a skill from the dropdown suggestions
    Then the selected skill should appear as a tag on the post job form

  @regression @positive @requires-employer-login @TC_PJ008
  Scenario: TC_PJ008 — A newly published job is immediately searchable on the public jobs page
    Given the employer has published a job with the title "Automation QA Engineer"
    When a candidate searches for "Automation QA Engineer" on the public jobs page
    Then the newly published job listing should appear in the search results
