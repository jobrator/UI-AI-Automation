@journey @e2e @cross-portal @integration
Feature: Cross-Channel Integration Journeys
  As a test team verifying the Jobrator platform
  I want the seams the mobile integration plan covers to be covered on the web too
  So that a defect at a join is caught on whichever channel it appears

  # Web counterparts of the mobile journeys added in JOBRATORMOBILE/Feature/Integration
  # (Mobile Integration Test Plan, 26 Sep 2026). Only the journeys the web suite did not
  # already have are here:
  #
  #   WEB-E2E-06  skill exam from the job to the score        (mobile E2E-06)
  #   WEB-E2E-08  candidate profile changes reach the employer (mobile E2E-08)
  #   WEB-E2E-14  a deleted candidate leaves the employer's side cleanly (mobile E2E-14)
  #
  # Already covered, so deliberately not duplicated: post -> apply (TC_J001), application
  # status (TC_J002, TC_J004), messaging (TC_J003), the duplicate-application guard (TC_J005)
  # and the interview a candidate can see (TC_SI003).
  #
  # Every journey seeds its own data through the API with a run tag, and registers its own
  # throwaway candidate: the exam allows one attempt per job, and deleting a profile is
  # irreversible - neither belongs to the shared account the rest of the suite signs in with.

  @regression @WEB-E2E-06 @skill-test
  Scenario: WEB-E2E-06 — A skill exam attached to a job is offered only after applying and scores the same for the candidate, the employer and the API
    Given a seeded job with a skill exam and a throwaway candidate with a CV
    Then starting the skill exam before applying should be refused by the API
    When the throwaway candidate logs in to the web app
    And the candidate applies for the seeded job on the web
    Then the seeded job should be listed on the candidate's applied jobs page
    And a skill test notification for the seeded job should be on the candidate dashboard
    When the candidate takes the attached skill test
    Then the score shown on the web should match the score the API recorded
    And the attached skill test should then be refused as already taken
    When the employer logs in and opens the applicants for the seeded job
    Then the employer should see the same skill test score for the candidate

  @regression @WEB-E2E-08 @profile
  Scenario: WEB-E2E-08 — What a candidate saves on their profile is what the employer reads on the candidate page
    Given a seeded job with a throwaway candidate who has applied on the web
    When the candidate saves a career summary carrying the run tag
    Then the saved summary should be on the candidate's own profile page
    When the employer logs in and opens the applicants for the seeded job
    And the employer opens the candidate page of the throwaway candidate
    Then the candidate page should show the summary the candidate saved
    And the candidate page should show the location as place names and not as ids

  @regression @WEB-E2E-14 @account-lifecycle
  Scenario: WEB-E2E-14 — A candidate who deletes their profile leaves the employer's applicant list intact
    Given a seeded job with a throwaway candidate who has applied on the web
    When the candidate deletes their profile from the web profile page
    Then the deleted account should no longer be able to sign in through the API
    When the employer logs in and opens the applicants for the seeded job
    Then the applicant list should load without an error
    And no applicant row should be left without a candidate name
