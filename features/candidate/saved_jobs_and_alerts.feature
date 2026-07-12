@candidate @saved-jobs @job-alerts
Feature: Candidate Saved Jobs and Job Alerts
  As a registered candidate on Jobrator
  I want to save interesting jobs and set up job alerts
  So that I never miss a relevant opportunity

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 1: Saved Jobs
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Authenticated candidate saves and manages jobs from the job listing page

    Background:
      Given the authenticated candidate is on the dashboard

    @regression @positive @requires-candidate-login @TC_SJ001
    Scenario: TC_SJ001 — Candidate can save a job from the public jobs listing page
      Given the candidate navigates to the jobs listing page
      When the candidate clicks the save or bookmark icon on a job card
      Then the job should be saved
      And the saved job should appear in the Saved Jobs section of the dashboard

    @regression @positive @requires-candidate-login @TC_SJ002
    Scenario: TC_SJ002 — Saved jobs list displays title, company, and action controls
      Given the candidate has at least one saved job
      When the candidate navigates to the Saved Jobs page
      Then all saved jobs should be displayed with a job title
      And each saved job entry should display the company name
      And each saved job entry should display an unsave action
      And each saved job entry should display an apply action

    @regression @positive @requires-candidate-login @TC_SJ003
    Scenario: TC_SJ003 — Candidate can remove a saved job from the Saved Jobs page
      Given the candidate has at least one saved job
      When the candidate navigates to the Saved Jobs page
      And the candidate clicks the unsave action on a saved job
      Then the job should be removed from the Saved Jobs list

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 2: Job Alerts
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Authenticated candidate creates and manages job alerts

    Background:
      Given the authenticated candidate navigates to the Job Alerts page

    @regression @positive @requires-candidate-login @TC_SJ004
    Scenario: TC_SJ004 — Candidate can create a new job alert with keyword and location
      When the candidate enters "QA Engineer" as the alert keyword
      And the candidate enters "Lagos" as the alert location
      And the candidate clicks the save alert button
      Then the new job alert should be created
      And the alert for "QA Engineer" should appear in the job alerts list

    @regression @negative @requires-candidate-login @TC_SJ005
    Scenario: TC_SJ005 — Job alert creation fails when required fields are empty
      When the candidate submits the job alert form without filling any fields
      Then a validation error should be displayed on the job alert form

    @regression @positive @requires-candidate-login @TC_SJ006
    Scenario: TC_SJ006 — Candidate can delete an existing job alert
      Given the candidate has at least one existing job alert
      When the candidate clicks the delete button on a job alert
      Then the job alert should be removed from the alerts list
