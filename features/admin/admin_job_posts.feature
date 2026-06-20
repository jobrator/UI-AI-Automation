@admin @admin-job-posts
Feature: Admin Job Post Management
  As a platform administrator
  I want to manage all job postings on the platform
  So that I can moderate content, correct errors, and control visibility of listings

  Background:
    Given the authenticated admin navigates to the Job Posts management page

  @smoke @positive @regression @TC_AJP001
  Scenario: TC_AJP001 — Job Posts admin page displays all platform job posts with key columns
    Then a table of job post records should be displayed
    And each record should display the job ID
    And each record should display the job title
    And each record should display the job location
    And each record should display the Is Draft status
    And each record should display the opening date
    And each record should display the closing date
    And each record should display the employment type
    And each record should display the work mode

  @regression @positive @TC_AJP002
  Scenario: TC_AJP002 — Admin can create a new job post from the admin console
    When the admin navigates to the create new job post form
    And the admin fills in all required job post fields with valid data
    And the admin saves the new job post
    Then the new job post should appear in the admin job posts list

  @regression @positive @TC_AJP003
  Scenario: TC_AJP003 — Admin can edit an existing job post and persist changes
    Given at least one job post exists in the admin job posts list
    When the admin clicks the Edit action on a job post record
    And the admin modifies the job post details
    And the admin saves the changes
    Then the updated job post details should be reflected in the admin job posts list

  @regression @positive @TC_AJP004
  Scenario: TC_AJP004 — Admin can toggle the Is Draft flag to make a job post publicly visible
    Given at least one job post exists with Is Draft set to true
    When the admin edits that job post and sets Is Draft to false
    And the admin saves the changes
    Then the job post should become publicly visible on the candidate jobs listing page

  @regression @positive @TC_AJP005
  Scenario: TC_AJP005 — Admin can delete a job post which removes it from the public listing
    Given at least one job post exists that can be safely deleted
    When the admin clicks the Delete action on that job post
    And the admin confirms the deletion
    Then the job post should be removed from the admin job posts list
    And the job post should no longer appear on the public jobs listing page

  @regression @positive @TC_AJP006
  Scenario: TC_AJP006 — Admin job posts table search and filter returns matching records
    When the admin uses the search functionality on the job posts page
    Then only job posts matching the search term should be displayed in the table
