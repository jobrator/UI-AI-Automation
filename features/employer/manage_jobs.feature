@employer @manage-jobs
Feature: Employer Manage Jobs
  As a registered employer on Jobrator
  I want to manage my existing job postings
  So that I can edit, deactivate, or remove vacancies as my hiring needs change

  Background:
    Given the authenticated employer navigates to the Manage Jobs page

  @smoke @positive @regression @requires-employer-login @TC_MJ001
  Scenario: TC_MJ001 — Manage Jobs page lists all job posts created by the employer
    Then all jobs posted by this employer should be listed on the manage jobs page
    And each job entry should display the job title
    And each job entry should display the job status
    And each job entry should display the opening date
    And each job entry should display the closing date

  @regression @positive @requires-employer-login @TC_MJ002
  Scenario: TC_MJ002 — Employer can open the edit form for an existing job post
    Given the employer has at least one published job
    When the employer clicks the Edit action on a job listing
    Then the edit job form should open
    And the form should be pre-populated with the existing job values

  @regression @positive @requires-employer-login @TC_MJ003
  Scenario: TC_MJ003 — Employer can save edits to a job post and see the updated values
    Given the employer has at least one published job
    When the employer clicks the Edit action on a job listing
    And the employer updates the job description with "Updated job description for automation testing."
    And the employer clicks the Save button on the edit form
    Then the changes should be persisted
    And the updated job description should be reflected on the job listing

  @regression @positive @requires-employer-login @TC_MJ004
  Scenario: TC_MJ004 — Employer can deactivate a job post which removes it from the public listing
    Given the employer has at least one published job
    When the employer deactivates the job from the manage jobs page
    Then the deactivated job should no longer appear on the public jobs listing page

  @regression @positive @requires-employer-login @TC_MJ005
  Scenario: TC_MJ005 — Employer can permanently delete a job post after confirming deletion
    Given the employer has at least one published job
    When the employer clicks the Delete action on a job listing
    And the employer confirms the deletion
    Then the job should be permanently removed from the manage jobs list

  @regression @positive @requires-employer-login @TC_MJ006
  Scenario: TC_MJ006 — Draft jobs are identifiable with a Draft badge in the manage jobs list
    Given the employer has at least one job saved as a draft
    When the employer is on the Manage Jobs page
    Then the draft job should be displayed with a Draft badge or indicator
