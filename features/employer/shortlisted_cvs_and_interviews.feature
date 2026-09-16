@employer @shortlisted @interviews
Feature: Employer Shortlisted CVs and Scheduled Interviews
  As a registered employer on Jobrator
  I want to manage shortlisted candidates and schedule interviews
  So that I can efficiently progress top applicants through the hiring process

  # NOTE: A candidate must have been shortlisted from the All Applicants page before
  # they appear here. See features/employer/all_applicants.feature (TC_AA005)
  # and features/journeys/job_application_journey.feature.

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 1: Shortlisted CVs
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Employer reviews shortlisted candidates

    Background:
      Given the authenticated employer navigates to the Shortlisted CVs page

    @smoke @positive @regression @requires-employer-login @TC_SI001
    Scenario: TC_SI001 — Shortlisted CVs page lists all shortlisted candidates with required details
      Given the employer has shortlisted at least one candidate
      Then all shortlisted candidates should be listed on the shortlisted CVs page
      And each shortlisted entry should display the candidate name
      And each shortlisted entry should display the applied job title
      And each shortlisted entry should display a CV download option

    @regression @positive @requires-employer-login @TC_SI002
    Scenario: TC_SI002 — Employer can initiate interview scheduling from the Shortlisted CVs page
      Given the employer has shortlisted at least one candidate
      When the employer clicks the Schedule Interview action on a shortlisted candidate
      # The live modal combines date and time into one datetime-local control and
      # has no interview format/type field — every interview is a meeting link.
      # See bugs/BUG-005 for the format-field spec gap.
      Then the interview scheduling form should appear
      And the form should contain a date field
      And the form should contain a time field
      And the form should contain an attendee email field
      And the form should contain a location or meeting link field

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 2: Scheduled Interviews
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Employer schedules and the candidate can view the interview

    Background:
      Given the authenticated employer has shortlisted at least one candidate

    @regression @positive @requires-employer-login @TC_SI003
    Scenario: TC_SI003 — A scheduled interview is visible to the candidate on their Scheduled Interviews page
      Given the employer schedules an interview for a shortlisted candidate with a future date and a meeting link
      When the candidate navigates to their Scheduled Interviews page
      Then the interview details should be visible with the correct job title
      And the interview details should display the correct date and time
      And the interview details should display the employer name

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 3: Skill Test Assignment
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Employer views and assigns skill tests to candidates

    Background:
      Given the authenticated employer navigates to the Skill Test assignment page

    @regression @positive @requires-employer-login @TC_SI005
    Scenario: TC_SI005 — Skill Test assignment page lists available exams that can be assigned to candidates
      Then the available skill tests should be listed on the skill test assignment page
      And each skill test entry should be assignable to a candidate
