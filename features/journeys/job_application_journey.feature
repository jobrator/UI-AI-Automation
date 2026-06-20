@journey @e2e @cross-portal
Feature: End-to-End Job Application Journey
  As a test team verifying the Jobrator platform
  I want to exercise the complete hiring lifecycle across all three portals
  So that I can confirm that admin setup, employer hiring actions, and candidate job-seeking flows
  work together correctly as an integrated system

  # ─────────────────────────────────────────────────────────────────────────
  #  Journey 1: Admin creates reference data → Employer posts job → Candidate applies
  # This journey validates that admin-managed reference data flows through
  # to the employer job posting form and is visible to candidates on the job listing.
  # ─────────────────────────────────────────────────────────────────────────

  @smoke @regression @TC_J001
  Scenario: TC_J001 — Admin creates a skill and industry, employer uses them to post a job, candidate finds and applies
    Given the admin is logged into the admin console
    And the admin creates a new skill named "Playwright Automation"
    And the admin creates a new industry named "Quality Assurance"
    When the employer logs in to the employer dashboard
    And the employer navigates to the Post A New Job page
    Then the skill "Playwright Automation" should be available in the skills field
    And the industry "Quality Assurance" should be available in the industry dropdown
    When the employer fills in all required job fields using the skill "Playwright Automation" and industry "Quality Assurance"
    And the employer publishes the job
    Then the job should be visible on the public jobs listing page
    When the candidate logs in and navigates to the jobs listing page
    And the candidate searches for the published job by title
    Then the job listing should appear in the search results
    When the candidate opens the job detail page and clicks Apply
    Then the application should be submitted
    And the applied job should appear on the candidate's Applied Jobs page with a Pending status

  # ─────────────────────────────────────────────────────────────────────────
  #  Journey 2: Employer reviews application, shortlists candidate,
  #             schedules interview → Candidate views scheduled interview
  # This journey continues from Journey 1 and validates the employer-side
  # pipeline management and the candidate's view of the resulting interview.
  # ─────────────────────────────────────────────────────────────────────────

  @regression @TC_J002
  Scenario: TC_J002 — Employer reviews and shortlists a candidate then schedules an interview that the candidate can view
    Given a candidate has submitted an application to an employer's job
    When the employer logs in and navigates to the All Applicants page
    Then the candidate's application should appear in the all applicants list with Pending status
    When the employer changes the application status to "Reviewed"
    Then the application status should update to Reviewed
    When the employer shortlists the candidate from the all applicants page
    Then the candidate should appear on the Shortlisted CVs page
    When the employer schedules an interview for the shortlisted candidate with a future date and an online meeting link
    Then the interview should be saved successfully
    When the candidate logs in and navigates to their Scheduled Interviews page
    Then the scheduled interview should be visible with the correct job title and employer name

  # ─────────────────────────────────────────────────────────────────────────
  #  Journey 3: Employer sends message to candidate → Candidate reads and replies
  # This journey validates the cross-portal messaging flow between employer
  # and candidate, exercising both portals in a single coherent test.
  # ─────────────────────────────────────────────────────────────────────────

  @regression @TC_J003
  Scenario: TC_J003 — Employer sends a message to a candidate and the candidate reads and replies
    Given a candidate has submitted an application to an employer's job
    When the employer logs in and navigates to the Messages page
    And the employer opens a conversation with the candidate
    And the employer sends the message "We are pleased to invite you for an interview. Please confirm your availability."
    Then the message should appear in the employer's conversation thread
    When the candidate logs in and navigates to their Messages page
    Then the employer's message should be visible in the candidate's message thread
    When the candidate replies with "Thank you! I am available on Wednesday afternoon."
    Then the reply should appear in the candidate's conversation thread
    When the employer refreshes the Messages page
    Then the candidate's reply should be visible in the employer's conversation thread

  # ─────────────────────────────────────────────────────────────────────────
  #  Journey 4: Admin moderates a job post and changes application status
  # This journey validates that admin can oversee and correct platform data
  # that flows through to both employer and candidate views.
  # ─────────────────────────────────────────────────────────────────────────

  @regression @TC_J004
  Scenario: TC_J004 — Admin updates an application status which is then reflected in candidate and employer views
    Given a candidate has submitted an application to an employer's job
    And the application currently has Pending status
    When the admin logs in and navigates to the Applications management page
    And the admin changes the application status to "Shortlisted"
    And the admin saves the changes
    Then the application status in the admin console should show "Shortlisted"
    When the candidate logs in and navigates to their Applied Jobs page
    Then the application should display the "Shortlisted" status
    When the employer logs in and navigates to the All Applicants page
    Then the candidate's application should display the "Shortlisted" status
